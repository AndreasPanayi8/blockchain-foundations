type Testcase = {
  msg: Object,
  ms: number
};

export const testcases : Testcase[] = [
  {msg: {type:'hello', version: '0.10.1', agent:'Grader'}, ms: 10},
  // {
  //   msg: {
  //     "object": {
  //       "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //       "created": 1771159355,
  //       "miner": "Marabu",
  //       "nonce": "00dd82159556175752d9ba7349df67bddd237b59183747383f7b720e85c32347",
  //       "note": "Financial Times 2026-02-13: Crypto's battle with the banks is splitting Trump's base",
  //       "previd": null,
  //       "txids":[],
  //       "type":"block"
  //     },"type":"object"}
  // , ms: 10},
  // {msg: {"objectid":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6","type":"getobject"}, ms: 10},
  
  // {
  //   msg: {"object": {
  //     "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //     "created":1771162955,
  //     "miner":"grader",
  //     "nonce":"19be8f41d0c616a4ea8e7e2accfa9d748318624e9cd39a0d53051187be1230cc",
  //     "note":"This block has a coinbase transaction",
  //     "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //     "txids":["e2e3d5919de1de1338217bfd1d364bf381c2c7336e0c85c46e4ae86232c26529"],"type":"block"},
  //     "type":"object"
  //   }
  //   , ms: 4000
  // },
  // {msg: {"objectid":"000000001a8a21aa884e5fa85a23a372a521d0ec3d74d2aaece160d306d0d9ab","type":"getobject"}, ms: 10},
  
  // {
  //   msg: {"object": {
  //     "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //     "created":1771166555,
  //     "miner": "grader",
  //     "nonce": "cfe9618f4dd22f37bfc237cacd8cb930d9181b10881b65ee19ebfef4f4884fa7",
  //     "note": "This block has another coinbase and spends earlier coinbase",
  //     "previd": "000000001a8a21aa884e5fa85a23a372a521d0ec3d74d2aaece160d306d0d9ab",
  //     "txids": ["a633520faec43d9dd868df547d397d3d1b0c326f9864f48eb8655f7f33cece95","f4535e84ded732f4ddacbb07133c2391844851da8e7f8b9484cff03ca833be0b"],
  //     "type":"block"},
  //     "type":"object"
  //   }
  //   , ms: 4000
  // },
  // {msg: {"objectid":"000000008852948c999acdfebe402d7e8a146a55c34b1a7c40960eb244b2f7e4","type":"getobject"}, ms: 10},
  
  // {msg: {"object": {
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1671148915,
  //   "miner":"grader",
  //   "nonce":"e3e0c078ec1440aacc008171a250a4559b317aa083284bc84c2ab1eba546c53f",
  //   "note":"Block with invalid PoW",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":[],
  //   "type":"block"}
  //   ,"type":"object"},ms: 10},
  
  // {msg: {
  //   "object": {"T":"0f00000000000000000000000000000000000000000000000000000000000000",
  //   "created":1771162955,
  //   "miner":"grader",
  //   "nonce":"a31d8edaa513aaa3e3e2fe930135f9942157fa3c135d1e435ba0c0b02252250d",
  //   "note":"Block with incorrect target","previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":[],
  //   "type":"block"},
  // "type":"object"}, ms: 10},
  
  // {msg: {"object": {
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771163955,
  //   "miner":"grader",
  //   "nonce":"0000000000000000000000000000000000000000000000000000000000000001"
  //   ,"note":"Block with invalid PoW",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":[],
  //   "type":"block"},
  //   "type":"object"}, ms: 10},

  // {msg: {"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771170155,
  //   "miner":"grader",
  //   "nonce":"3d9326cbbce4311f922b0a671d4c1d83c528efaee5d72dbf9cd61660d6b671d1",
  //   "note":"This block has a coinbase transaction",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb"],
  //   "type":"block"},
  //   "type":"object"},ms: 10},
  // {msg: {"objectid":"0000000025686ecaf9edb4eba5146e73099636dc5f856f363313c22b3237d223","type":"getobject"}, ms: 4000},
  // {msg: {"object": {
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771173755,
  //   "miner":"grader",
  //   "nonce":"6a9e3d7de241ba5bd31d66cf1f0828a04ce33d0a28d55b91fd2924d243005832",
  //   "note":"This block violates the law of conservation",
  //   "previd":"0000000025686ecaf9edb4eba5146e73099636dc5f856f363313c22b3237d223",
  //   "txids":["9baa94270d6d5c62dd4180f2fc8b061eda8a69ee7448a17ad7678bb6c0d2f8f0","be80036646cfdc85b27c1564a3160d44ec5c30ec14f3c401f724ec3f1742ca34"],
  //   "type":"block"},"type":"object"}, ms: 10},
  
  // {msg: {"object": {
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771173755,
  //   "miner":"grader",
  //   "nonce":"fc4506d7c75f303dcb0d68641ea04d9815e73f18f7f7770df183f8ef6c93ecb5",
  //   "note":"This block has a transaction spending the coinbase",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb","be80036646cfdc85b27c1564a3160d44ec5c30ec14f3c401f724ec3f1742ca34"]
  //   ,"type":"block"},
  //   "type":"object"},ms:10},
    
  // {msg: {"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771177355,
  //   "miner":"grader",
  //   "nonce":"db24f2b5f712ec3a3698eaf48fadc1b3ee86c140e2a6d60d9aba0272975ea5fa",
  //   "note":"This block contains an invalid transaction",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb","e52a193089f62a81a839f29ae81f078eefb73d606b054af67bf46f824adfe527"],
  //   "type":"block"},
  //   "type":"object"}, ms:100},


  // {msg: {"object": {"T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771180955,
  //   "miner":"grader",
  //   "nonce":"d16b98c66bb8262a291eb1c2d9d743245c4c88303490003cb4d3702bbc15835b",
  //   "note":"This block has 2 coinbase transactions",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb","6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb"]
  //   ,"type":"block"},"type":"object"}, ms: 50}

  // {msg: {"object":{
  //     "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //     "created":1771184555,
  //     "miner":"grader",
  //     "nonce":"36a150836fc4a7dbfa40d64c9cf616c0d4a3ac18e6bf46fbc2514ea45bdaaf5c",
  //     "note":"This block has a coinbase transaction",
  //     "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //     "txids":["96339757c036018f3f272b2d8128248241e6ecfe0f9047d7f2cfe2fde3df267a"],
  //     "type":"block"},"type":"object"}
  // , ms: 4000},
  // {msg: {"objectid":"00000000556048ae26893c5bd08e9539b2f62ca5b5847b87a6c8e9800f0da467","type":"getobject"}, ms:1000},
  // {msg:{"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771188155,
  //   "miner":"grader",
  //   "nonce":"a2275563b730b184200896bff2c8b9bb88206e21c64a67659dcffead83003c27",
  //   "note":"This block spends coinbase transaction twice",
  //   "previd":"00000000556048ae26893c5bd08e9539b2f62ca5b5847b87a6c8e9800f0da467",
  //   "txids":["0308131405b190db3c94052b9b7185a62538010c8e5298cb104e31edc5a68877","d38db64554dcb26d5246ec7f4ea365b654f1bb1710a9c6615e8053cea11ca547"],
  //   "type":"block"},"type":"object"}, ms:50}

  // {msg: {"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771191755,
  //   "miner":"grader",
  //   "nonce":"dd8c12b37231a171ce8909f379bc86b7fb3be1599eec863f7d221d967f8bfb47",
  //   "note":"This block has a coinbase transaction",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["c825462af622841b4be6c023c32eecc0a723be845ee867efee41debe24a5fb8c"],
  //   "type":"block"},"type":"object"}, ms: 4000},
  // {msg: {"objectid":"000000002285ac3f587def52a366014f5d2e2ecc38e6527a14c11f912c7fa9fc","type":"getobject"}, ms: 50},
  // {msg: {"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000"
  //   ,"created":1771195355,
  //   "miner":"grader",
  //   "nonce":"4875ff49c105353fefd45057f42790c4efd727714d90074970d4e8458e34b467",
  //   "note":"This block spends coinbase transaction once (it is valid)",
  //   "previd":"000000002285ac3f587def52a366014f5d2e2ecc38e6527a14c11f912c7fa9fc",
  //   "txids":["01d62f3494326ff8f0541b9d0d06395be32d6761d919be4ae311bc5172ba80d7"],
  //   "type":"block"},"type":"object"}, ms: 4000},
  // {msg: {"objectid":"0000000075e0bff767796c8b3beb771aeda55c2d18b947ab13bb01334f4038ed","type":"getobject"}, ms: 1000},
  // {msg: {"object":{
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771198955,
  //   "miner":"grader",
  //   "nonce":"65888dc80eb6b0b12879e47c68c49a5e9215bcdf1677825d4fcc1aa92b650b44",
  //   "note":"This block spends coinbase transaction again (it is invalid)",
  //   "previd":"0000000075e0bff767796c8b3beb771aeda55c2d18b947ab13bb01334f4038ed",
  //   "txids":["ddb6a2d270a34f5007237d4f34814b48262c26ef94cc0b9245d8ca1dafbc4070"],
  //   "type":"block"},"type":"object"}, ms: 50}

  // {msg: {"object":{
  //   "height":1,
  //   "outputs":[{"pubkey":"e39b7117f6bd94dd174f96556fc0850f564b873e8b873e507556493a200176b3",
  //   "value":50000000000000}],
  //   "type":"transaction"},"type":"object"},ms:50},
  // {msg: {"objectid":"e5ed65492e6b9fc7bdeaaf3ae1b7aa1d850ffec4cd9903067e01496ccef80d8b","type":"getobject"}, ms: 50},
  // {msg: {"object": {
  //   "T":"00000000abc00000000000000000000000000000000000000000000000000000",
  //   "created":1771198955,
  //   "miner":"grader",
  //   "nonce":"c70416fef43c0e191778bb04df0945c100db9241d640ac5e1c2b4a9562246f94",
  //   "note":"This block spends a coinbase transaction not in its prev blocks",
  //   "previd":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6",
  //   "txids":["c623a2700681dbc7a9a31bcd1d5128777adb107ad0f143d9367ee0dbb5a6bd0f"],
  //   "type":"block"},"type":"object"}, ms:50}

]