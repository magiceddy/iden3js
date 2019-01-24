const claim = require('../claim/claim');
const DataBase = require('../db/db');
const CONSTANTS = require('../constants');
/**
 * @param  {String} keyRecover
 * @param  {String} keyRevoke
 * @param  {String} keyOp
 * @param  {Object} relay
 * @param  {String} implementation
 */
class Id {
  constructor(keyOpPub, keyRecover, keyRevoke, relay, relayAddr, implementation = '', backup = undefined, keyProfilePath = 0) {
    const db = new DataBase();
    this.db = db;
    this.keyRecover = keyRecover;
    this.keyRevoke = keyRevoke;
    this.keyOperationalPub = keyOpPub;
    this.relay = relay;
    this.relayAddr = relayAddr; // this can be get from a relay endpoint
    this.idAddr = undefined;
    this.implementation = implementation;
    this.backup = backup;
    this.prefix = CONSTANTS.IDPREFIX;
    this.keyProfilePath = keyProfilePath;
  }

  /**
   * Save keys associated with this Identity address
   * @returns {Bool} - Acknowledge
   */
  saveKeys() {
    const stringKey = this.prefix + CONSTANTS.KEYPREFIX + this.idAddr;
    const objectValue = {
      keyProfilePath: this.keyProfilePath,
      keyPath: 4,
      keys: {
        operational: this.keyOperational,
        operationalPub: this.keyOperationalPub,
        recover: this.keyRecover,
        revoke: this.keyRevoke,
      },
    };
    this.db.insert(stringKey, JSON.stringify(objectValue));
    return true;
  }

  /**
   * Create new key for this identity and store it into its
   * @param {Object} keyContainer - Object containing all the keys created on local storage
   * @param {String} keyLabel - Label associated with the key or address created
   * @param {Bool} isPublic - Determines if it is wanted to generate a public key or a public address
   * @returns {Bool} Acknowledge
   */
  createKey(keyContainer, keyLabel, isPublic = false) {
    const stringKey = this.prefix + CONSTANTS.KEYPREFIX + this.idAddr;
    const keyObject = JSON.parse(this.db.get(stringKey));
    const newKey = keyContainer.generateSingleKey(this.keyProfilePath, keyObject.keyPath, isPublic);
    keyObject.keyPath += 1;
    keyObject.keys[keyLabel] = newKey;
    this.db.insert(stringKey, JSON.stringify(keyObject));
    return newKey;
  }

  /**
   * Get all the keys associated to this idenity
   * @returns {Object} Contains all the keys as an object in a form: { label key - key }
   */
  getKeys() {
    const stringKey = this.prefix + CONSTANTS.KEYPREFIX + this.idAddr;
    const keyObject = JSON.parse(this.db.get(stringKey));
    return keyObject.keys;
  }

  createID() {
    // send the data to Relay,and get the generated address of the counterfactual
    return this.relay.createID(this.keyOperationalPub, this.keyRecover, this.keyRevoke)
      .then((res) => {
        this.idAddr = res.data.idaddr;
        this.saveKeys();
        return { idAddr: this.idAddr, proofOfClaim: res.data.proofOfClaim };
      });
  }

  deployID() {
    return this.relay.deployID(this.idAddr);
  }

  /**
   * @param  {Object} kc
   * @param  {String} kSign
   * @param  {String} typeStr
   * @param  {String} extraIndexData
   * @param  {String} data
   * @returns {Object}
   */
  genericClaim(kc, kSign, proofOfKSign, typeStr, extraIndexData, data) {
    const genericClaim = new claim.GenericClaim('namespace', typeStr, extraIndexData, data); // TODO namespace will be hardcoded in conf
    const signatureObj = kc.sign(kSign, genericClaim.hex());
    const bytesSignedMsg = {
      valueHex: genericClaim.hex(),
      signatureHex: signatureObj.signature,
      ksign: kSign,
    };

    const self = this;
    return this.relay.postClaim(this.idAddr, bytesSignedMsg)
      .then((res) => {
        if ((self.backup !== undefined) && (proofOfKSign !== undefined)) {
          self.backup.backupData(kc, self.idAddr, kSign, proofOfKSign, 'claim', genericClaim.hex(), self.relayAddr);
        }
        return res;
      });
  }

  /**
   * Send new claim of type authorizeKSignSecp256k1 to the identity merkle tree through the associated relay
   * @param {Object} - Key container
   * @param {String} - Key used to sign the claim. This key has to be already authorized on the identity merkle tree
   * @param {keyClaim} - New key to be authorized and added into the identity merkle tree
   */
  authorizeKSignSecp256k1(kc, ksignpk, keyClaim) {
    const authorizeKSignClaim = new claim.Factory(CONSTANTS.CLAIMS.AUTHORIZE_KSIGN_SECP256K1.ID, {
      version: 0, pubKeyCompressed: keyClaim,
    });
    const claimHex = (authorizeKSignClaim.createEntry()).toHexadecimal();
    const signatureObj = kc.sign(ksignpk, claimHex);
    const bytesSignedMsg = {
      valueHex: claimHex,
      signatureHex: signatureObj.signature,
      ksignpk,
    };
    const self = this;
    return this.relay.postClaim(this.idAddr, bytesSignedMsg)
      .then((res) => {
        if ((self.backup !== undefined)) { // && (proofOfKSign !== undefined)) {
          // Private folder - future work
          // self.backup.backupData(kc, self.idAddr, ksign, proofOfKSign, 'claim', authorizeKSignClaim.hex(), self.relayAddr);
        }
        return res;
      });
  }

  /**
   * Bind current identity to an address through name resolver service
   * @param {Object} kc - Key container
   * @param {String} name - Label to identify the address
   */
  bindID(kc, name) {
    return this.relay.bindID(kc, this.idAddr, this.keyOperationalPub, name);
  }
}

module.exports = Id;
