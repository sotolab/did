/**
* 12.15.2019
* Created by Soto
* Copyright @ Sunstar 
*/ 


// 0: Olympic, Ethereum public pre-release PoW testnet
// 1: Frontier, Homestead, Metropolis, the Ethereum public PoW main network
// 1: Classic, the (un)forked public Ethereum Classic PoW main network, chain ID 61
// 1: Expanse, an alternative Ethereum implementation, chain ID 2
// 2: Morden Classic, the public Ethereum Classic PoW testnet
// 3: Ropsten, the public cross-client Ethereum PoW testnet
// 4: Rinkeby, the public Geth-only PoA testnet
// 5: Goerli, the public cross-client PoA testnet
// 6: Kotti Classic, the public cross-client PoA testnet for Classic
// 8: Ubiq, the public Gubiq main network with flux difficulty chain ID 8
// 10: Quorum, the JP Morgan network
// 42: Kovan, the public Parity-only PoA testnet
// 60: GoChain, the GoChain networks mainnet
// 77: Sokol, the public POA Network testnet
// 99: Core, the public POA Network main network
// 100: xDai, the public MakerDAO/POA Network main network
// 31337: GoChain testnet, the GoChain networks public testnet
// 401697: Tobalaba, the public Energy Web Foundation testnet
// 7762959: Musicoin, the music blockchain
// 61717561: Aquachain, ASIC resistant chain

const express = require('express')
const bodyParser = require('body-parser')
const ngrok = require('ngrok')
const decodeJWT = require('did-jwt').decodeJWT
const { Credentials } = require('uport-credentials')
const transports = require('uport-transports').transport
const message = require('uport-transports').message.util

const data = Credentials.createIdentity();
const outdid = data.did;
const outprivateKey = data.privateKey;

console.log("+Output: " , data);
console.log("+did: " , data.did);
console.log("+privateKey: " , data.privateKey);


let endpoint = ' '
const app = express();
app.use(bodyParser.json({ type: '*/*' }))

//setup Credentials object with newly created application identity.
const credentials = new Credentials({
  appName: 'Create Verification Example',
  did: outdid,
  privateKey: outprivateKey
})

console.log("Output: ", credentials);


app.get('/', (req, res) => {
  credentials.createDisclosureRequest({
    notifications: true,
    accountType: 'keypair',
    network_id: '0x4',
    callbackUrl: endpoint + '/callback'
  }).then(requestToken => {
    console.log("requestToken : " , requestToken)
    console.log("decodeJWT : " , decodeJWT(requestToken))  //log request token to console
    const uri = message.paramsToQueryString(message.messageToURI(requestToken), {callback_type: 'post'})
    const qr =  transports.ui.getImageDataURI(uri)
    res.send(`<div><img src="${qr}"/></div>`)
  })
})


app.post('/callback', (req, res) => {
  console.log("Callback hit")
  const jwt = req.body.access_token
  credentials.authenticateDisclosureResponse(jwt).then(creds => {
    // take this time to perform custom authorization steps... then,
    // set up a push transport with the provided 
    // push token and public encryption key (boxPub)
    const push = transports.push.send(creds.pushToken, creds.boxPub)

    console.log("creds : " , creds)

    const txObject = {
      to: creds.mnid,
      value: '10000000000000000',
    }

    credentials.createTxRequest(txObject, {callbackUrl: `${endpoint}/txcallback`, callback_type: 'post'}).then(attestation => {
      console.log(`Encoded JWT sent to user: ${attestation}`)
      return push(attestation)  // *push* the notification to the user's uPort mobile app.
    }).then(res => {
      console.log("res : " , res)
      console.log('Push notification sent and should be recieved any moment...')
      console.log('Accept the push notification in the uPort mobile application')
    })
  })
})

app.post('/txcallback', (req, res) => {
  console.log("txCallback hit")
  console.log("req.body : " , req.body)
  ngrok.disconnect()
})

// run the app server and tunneling service
const server = app.listen(8088, () => {
  ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Tx-Signing Service running, open at ${endpoint}`)
  })
})

