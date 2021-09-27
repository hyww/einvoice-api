const fetch = require('node-fetch');
const uuid = require('uuid/v4');
const hmacsha1 = require('hmacsha1');
const Parser = require('binary-parser').Parser;

const apiHost = "https://api.einvoice.nat.gov.tw"

module.exports = function (AppID, APIKey, UUID=uuid()) {
  let e = {};
  e.AppID = AppID;
  e.APIKey = APIKey;
  e.UUID = UUID;


  /*
    get invoice detail
    invNum: string, 'AB12345678'
    isQR: boolean
    invDate: string, '2012/07/11'
    randomNumber: string, '0000'
    invTerm: string, '10108', Barcode
    encrypt: string, QR
    sellerID: string, QR
  */
  e.getInvoice = function(inv){
    const endPoint = `${apiHost}/PB2CAPIVAN/invapp/InvApp`;
    let data = {
      version: 0.3,
      invNum: inv.invNum,
      action: 'qryInvDetail',
      generation: 'V2',
      invDate: inv.invDate,
      UUID: e.UUID,
      randomNumber: inv.invRandom,
      appID: e.AppID,
    };
    if (inv.isQR) {
      data.type = 'QRCode';
      data.encrypt = inv.encrypt;
      data.sellerID = inv.sellerID;
    }
    else {
      data.type = 'Barcode';
      data.invTerm = inv.invTerm;
    }
    
    let params = '';
    for (const prop in data) {
      params+= prop+'='+data[prop]+'&';
    }
    params = params.slice(0,-1);

    return fetch(endPoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  }

  /*
    get carrier invoice header
    card {
      cardType: string
        3J0002: cell phone
        1K0001: easy card
        2G0001: iCash, not supported?
      cardNo: string
      cardEncrypt: string
    }
    startDate, endDate: string, yyyy/MM/dd, must in same month
    onlyWin: boolean
  */
  e.getCarrier = function(card, startDate, endDate, onlyWin) {
    const endPoint = `${apiHost}/PB2CAPIVAN/invServ/InvServ`;
    const timeStamp = parseInt((new Date()).valueOf()/1000, 10)+10;
    const onlyWinningInv = onlyWin?'Y':'N';
    let data = {
      action: 'carrierInvChk',
      appID: e.AppID,
      cardEncrypt: card.cardEncrypt,
      cardNo: card.cardNo,
      cardType: card.cardType,
      endDate,
      expTimeStamp: 2147483647,
      onlyWinningInv,
      startDate,
      timeStamp,
      uuid: e.UUID,
      version: 0.3,
    };

    let params = '';
    for (const prop in data) {
      params+= prop+'='+data[prop]+'&';
    }
    params = params.slice(0,-1);
    //params+= '&Signature='+hmacsha1(e.APIKey, params);

    return fetch(endPoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  };

  /*
    get carrier invoice detail
    card {
      cardType: string
        3J0002: cell phone
        1K0001: easy card
        2G0001: iCash, not supported?
      cardNo: string
      cardEncrypt: string
    }
    invNum: string
    invDate: yyyy/MM/dd
  */
  e.getCarrierDetail = function(card, invNum, invDate) {
    const endPoint = `${apiHost}/PB2CAPIVAN/invServ/InvServ`;
    const timeStamp = parseInt((new Date()).valueOf()/1000)+10;
    let data = {
      action: 'carrierInvDetail',
      appID: e.AppID,
      cardEncrypt: card.cardEncrypt,
      cardNo: card.cardNo,
      cardType: card.cardType,
      expTimeStamp: 2147483647,
      invDate,
      invNum,
      timeStamp,
      uuid: e.UUID,
      version: 0.3,
    };

    let params = '';
    for (const prop in data) {
      params+= prop+'='+data[prop]+'&';
    }
    params = params.slice(0,-1);

    return fetch(endPoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  };

  /*
    parse QRCode data

    please remove `**` at the beginning of the second QRCode and concat data from two QRCode before passing to this function
  */
  const QRParser = new Parser()
    .string('invNum', {length:10})
    .string('invDate', {
      length:7,
      formatter: (d)=>(
        (parseInt(d.slice(0,3),10)+1911).toString() +
        '/' + d.slice(3,5) + '/' + d.slice(5,7)
      )
    })
    .string('invRandom', {length:4})
    .string('total', {
      length:8,
      formatter: (h)=>parseInt(h,16)
    })
    .string('withTax', {
      length:8,
      formatter: (h)=>parseInt(h,16)
    })
    .string('buyerID', {length:8})
    .string('sellerID', {length:8})
    .string('encrypt', {length:24})
    .skip(1)
    .string('sellerDef', {length:10})
    .skip(1)
    .buffer('itemNum', {
      readUntil: ':',
      formatter: b=>parseInt(b,10),
    })
    .skip(1)
    .buffer('itemTotalNum', {
      readUntil: ':',
      formatter: b=>parseInt(b,10),
    })
    .skip(1)
    .buffer('encoding', {
      readUntil: ':',
      formatter: b=>parseInt(b,10),
    })
    .choice('', {
      tag: 'encoding',
      choices: {
        1: new Parser()
          .array('details', {
            type: new Parser()
              .skip(1)
              .buffer('name', {
                readUntil: ':',
                formatter: b=>b.toString(),
              })
              .skip(1)
              .buffer('num', {
                readUntil: ':',
                formatter: b=>parseInt(b, 10),
              })
              .skip(1)
              .buffer('price', {
                readUntil: ':',
                formatter: b=>parseInt(b, 10),
              })
            ,
            length: 'itemNum'
          })
      },
      defaultChoice: new Parser()
    })

  e.parseQR  = function(qr) {
    let data = QRParser.parse(Buffer.from(qr));
    data.isQR = true;
    return data;
  }
  return e;
}

