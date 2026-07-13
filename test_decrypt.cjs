const CryptoJS = require("crypto-js");
const encrypted = "ID2ieOjCrwdjlkMElYlzWCptgNdUpWD8Pk4JuFSl272TslEEyGoerp/t/LHlrnYDstoGulzbyG8IoPvyFR6iIo92mytrdt3FSpts30PcFYg=";
const key = CryptoJS.enc.Utf8.parse("38346591");
try {
    const decrypted = CryptoJS.DES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    console.log("Decrypted URL:", decrypted);
    
    // Test a second one
    const enc2 = "ID2ieOjCrwfgWvL5sXl4B1ImC5QfbsDyqs4uGqukqoB2OG4Nq26PSfM0C5fGS5N5SmZtT+potSotNTgq3GwXVRw7tS9a8Gtq";
    const dec2 = CryptoJS.DES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(enc2) },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    console.log("Decrypted URL 2:", dec2);

} catch (e) {
    console.error(e);
}
