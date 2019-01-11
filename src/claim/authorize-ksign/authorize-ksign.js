const Entry = require('../entry/entry');
const utils = require('../../utils');

/**
 * Class representing an authorized Ksign claim
 * Authorized Ksign claim is used to authorize a public key for being used afterwards
 * Authorized Ksign element representation is as follows:
 * |element 3|: |empty|Ax|sign|version|claim type| - |3 bytes|16 bytes|1 bytes|4 bytes|8 bytes|
 * |element 2|: |empty|Ay| - |16 bytes|16 bytes|
 * |element 1|: |empty| - |32 bytes|
 * |element 0|: |empty| - |32 bytes|
 */
class AuthorizeKSign {
  /**
   * Initialize raw claim data structure
   * Bytes are taken according element claim structure
   * Claim type is a string used to define this concrete claim. Last 8 bytes of its hash are taken
   * @param {Object} data - Input parameters
   * Data input object contains:
   * {Uint32} _version - Version assigned to the claim
   * {Bool} _sign - Sign of the coordinate X of an eliptic curve point
   * {String} _ax - Coordinate X of an eliptic curve point
   * {String} _ay - Coordinate Y of an eliptic curve point
   */
  constructor(data) {
    const versionBuff = Buffer.alloc(4);
    const signBuff = Buffer.alloc(1);
    const {
      version, sign, ax, ay,
    } = data;
    signBuff.writeUInt8(sign);
    versionBuff.writeUInt32BE(version);
    this._structure = {
      claimType: utils.hashBytes('iden3.claim.authorize_k_sign').slice(24, 32),
      version: versionBuff,
      sign: signBuff,
      ax: utils.hexToBytes(ax),
      ay: utils.hexToBytes(ay),
    };
  }

  /**
   * Retrieve claim structure
   * @returns {Object} Raw data claim structure
   */
  get structure() {
    return this._structure;
  }

  /**
   * Code raw data claim object into an entry claim object
   * @returns {Object} Element representation of the claim
   */
  createEntry() {
    const claimEntry = new Entry();
    let endIndex = claimEntry.elements[3].length;
    let startIndex = endIndex - this._structure.claimType.length;
    // claim element 3 composition
    claimEntry.elements[3].fill(this._structure.claimType, startIndex, endIndex);
    endIndex = startIndex;
    startIndex = endIndex - this._structure.version.length;
    claimEntry.elements[3].fill(this._structure.version, startIndex, endIndex);
    endIndex = startIndex;
    startIndex = endIndex - this._structure.sign.length;
    claimEntry.elements[3].fill(this._structure.sign, startIndex, endIndex);
    endIndex = startIndex;
    startIndex = endIndex - this._structure.ax.length;
    claimEntry.elements[3].fill(this._structure.ax, startIndex, endIndex);
    // claim element 2 composition
    endIndex = claimEntry.elements[2].length;
    startIndex = claimEntry.elements[2].length - this._structure.ay.length;
    claimEntry.elements[2].fill(this._structure.ay, startIndex, endIndex);
    // claim element 1 remains as empty value
    // claim element 0 remains as empty value
    return claimEntry;
  }
}

/**
 * Decode field claim structure into raw data claim structure
 * @param {Object} elements - Element representation of the claim
 * @returns {Object} AuthorizeKSign class object
 */
function parseAuthorizeKSign(entry) {
  const claim = new AuthorizeKSign({
    version: 0, ax: '', ay: '', sign: false,
  });
  // Parse element 3
  claim.structure.claimType = entry.elements[3].slice(24, 32);
  claim.structure.version = entry.elements[3].slice(20, 24);
  claim.structure.sign = entry.elements[3].slice(19, 20);
  claim.structure.ax = entry.elements[3].slice(3, 19);
  // Parse element 2
  claim.structure.ay = entry.elements[2].slice(16, 32);
  return claim;
}

module.exports = {
  AuthorizeKSign,
  parseAuthorizeKSign,
};