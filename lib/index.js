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
  e.getInvoice = function(invNum, isQR, invDate, detail){
    const endPoint = 'https://www.einvoice.nat.gov.tw/PB2CAPIVAN/invapp/InvApp';
    const randomNumber = ('000'+parseInt(Math.random()*10000).toString()).slice(-4);
    let data = {
      version: 0.3,
      invNum,
      action: 'qryInvDetail',
      generation: 'V2',
      invDate,
      UUID: e.UUID,
      randomNumber: randomNumber,
      appID: e.AppID,
    };
    if (isQR) {
      data.type = 'QRCode';
      data.encrypt = detail.encrypt;
      data.sellerID = detail.sellerID;
    }
    else {
      data.type = 'Barcode';
      data.invTerm = detail.invTerm;
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
    cardType: string
      3J0002: cell phone
      1K0001: easy card
      2G0001: iCash, not supported?
    cardNo: string
    expTimeStamp: string
    startDate, endDate: string, yyyy/MM/dd, must in same month
    onlyWin: boolean
    cardEncrypt: string
  */
  e.getCarrier = function(cardType, cardNo, expTimeStamp, startDate, endDate, onlyWin, cardEncrypt) {
    const endPoint = 'https://www.einvoice.nat.gov.tw/PB2CAPIVAN/invServ/InvServ';
    const timeStamp = parseInt((new Date()).valueOf()/1000)+10;
    const onlyWinningInv = onlyWin?'Y':'N';
    let data = {
      action: 'carrierInvChk',
      appID: e.AppID,
      cardEncrypt,
      cardNo,
      cardType,
      endDate,
      expTimeStamp,
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
    params+= '&Signature='+hmacsha1(e.APIKey, params);

    return fetch(endPoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  };

  return e;
}

