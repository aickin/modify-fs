"use strict";

const util = require("util");
const RealItem = require("./realitem.js");
const constants = require("constants");
const fs = require("fs");
const bypass = require("./bypass");

const EMPTY = Buffer.alloc(0);

/**
 * A file.
 * @class
 */
function RealFile(path) {
  RealItem.call(this, path);
}
util.inherits(RealFile, RealItem);

/**
 * Get the file contents.
 * @return {Buffer} File contents.
 */
RealFile.prototype.getContent = function () {
  return bypass(() => fs.readFileSync(this._path));
};

/**
 * Set the file contents.
 * @param {string|Buffer} content File contents.
 */
RealFile.prototype.setContent = function (content) {
  if (typeof content === "string") {
    // TODO: should we support non-utf-8?
    content = Buffer.from(content, "utf-8");
  } else if (!Buffer.isBuffer(content)) {
    throw new Error("File content must be a string or buffer");
  }
  bypass(() => fs.writeFileSync(this._path, content));
};

/**
 * Get file stats.
 * @param {boolean} bigint Use BigInt.
 * @return {object} Stats properties.
 */
// RealFile.prototype.getStats = function (bigint) {
//   // const size = this.getContent().length; // this._content.length;
//   const stats = RealItem.prototype.getStats.call(this, bigint);
//   const convert = bigint ? (v) => BigInt(v) : (v) => v;

//   // stats[1] = convert(this.getMode() | constants.S_IFREG); // mode
//   // stats[8] = convert(size); // size
//   // stats[9] = convert(Math.ceil(size / 512)); // blocks

//   return stats;
// };

/**
 * Export the constructor.
 * @type {function()}
 */
module.exports = RealFile;
exports = module.exports;
