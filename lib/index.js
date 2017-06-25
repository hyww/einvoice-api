const fetch = require('node-fetch');
const uuid = require('uuid/v4');
const hmacsha1 = require('hmacsha1');

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
    invTerm: string, '10108', Barcode
    encrypt: string, QR
    sellerID: string, QR
  */
  e.getInvoice = function(inv){
    const endPoint = 'https://www.einvoice.nat.gov.tw/PB2CAPIVAN/invapp/InvApp';
    const randomNumber = ('000'+parseInt(Math.random()*10000).toString()).slice(-4);
    let data = {
      version: 0.3,
      invNum: inv.invNum,
      action: 'qryInvDetail',
      generation: 'V2',
      invDate: inv.invDate,
      UUID: e.UUID,
      randomNumber: randomNumber,
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
    const endPoint = 'https://www.einvoice.nat.gov.tw/PB2CAPIVAN/invServ/InvServ';
    const timeStamp = parseInt((new Date()).valueOf()/1000)+10;
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
    const endPoint = 'https://www.einvoice.nat.gov.tw/PB2CAPIVAN/invServ/InvServ';
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
  e.parseQR  = function(qr) {
    return ({
      invNum : qr.slice(0,10),
      invDate : (parseInt(qr.slice(10,13),10)+1911).toString()+'/'+qr.slice(13,15)+'/'+qr.slice(15,17),
      invRandom : qr.slice(17,21),
      total : parseInt(qr.slice(21,29),16),
      totalTax : parseInt(qr.slice(29,37),16),
      buyerID : qr.slice(37,45),
      sellerID : qr.slice(45,53),
      encrypt : qr.slice(53,77),
      isQR: true,
    });
  }
  return e;
}

