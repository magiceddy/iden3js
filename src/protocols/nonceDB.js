/**
 * Class representing the NonceDB
 */
class NonceDB {
	/**
	 * Initialie NonceDB
	 */
	constructor() {
		this.nonces = [];
	}

	/**
	 * Add nonce with a specified timeout
	 * The nonce will be valid until that timeout
	 * @param {String} nonce
	 * @param {Number} timeout, in unixtime format
	 */
	_add(nonce, timeout) {
	  this.nonces.push({
	    nonce: nonce,
	    timestamp: timeout
	  });
	};

	/**
	 * Add nonce with a specified delta
	 * The nonce will be valid until current-time + delta
	 * @param {String} nonce
	 * @param {Number} delta, in seconds unit
	 */
	add(nonce, delta) {
	    	const date = new Date();
	    	const timestamp = Math.round((date).getTime() / 1000);
		const timeout = timestamp + delta;
		this._add(nonce, timeout);
		return timeout;
	};

	/**
	 * Search nonce in NoceDB
	 * @param {String} nonce
	 * @returns {Object}
	 */
	search(nonce) {
	  this.deleteOld();
	  for(let i=0;i<this.nonces.length; i++) {
	    if (this.nonces[i].nonce==nonce) {
	      return {nonce: this.nonces[i], index: i};
	    }
	  }
	  return undefined;
	}

	/**
	 * Search nonce in NoceDB, and then delete it
	 * @param {String} nonce
	 * @returns {bool}
	 */
	searchAndDelete(nonce) {
		const n = this.search(nonce);
		if (n===undefined){
		    return false;
		}
	  	this.nonces.splice(n.index, 1);
		return true;
	}

	/**
	 * Delete element in NonceDB
	 * @param {String} nonce
	 */
	deleteElem(nonce) {
	  const n = this.search(nonce);
	  if (n===undefined) {
		return;
	  }
	  this.nonces.splice(n.index, 1);
	}

	/**
	 * Delete nonces with timestamp older than the given
	 * @param {Number} timestamp - if not specified will get current time
	 */
	deleteOld(timestamp) {
	if (timestamp===undefined) {
	    const date = new Date();
	    timestamp = Math.round((date).getTime() / 1000);
	}
	  for(let i=0;i<this.nonces.length; i++) {
	    if (this.nonces[i].timestamp>=timestamp) {
	      this.nonces.splice(0, i);
	      break;
	    }
	  }
	}
}

module.exports = NonceDB;
