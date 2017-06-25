const fetch = require('node-fetch');
const uuid = require('uuid/v4');

module.exports = function (AppID, APIKey, UUID=uuid()) {
  let e = {};
  e.AppID = AppID;
  e.APIKey = APIKey;
  e.UUID = UUID;
  /*
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
  return e;
}

