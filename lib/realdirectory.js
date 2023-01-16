"use strict";

const util = require("util");
const RealItem = require("./realitem.js");
const constants = require("constants");
const bypass = require("bypass");
const fs = require("fs");
const path = require("path");
const RealFile = require("./realfile.js");

/**
 * A directory.
 * @class
 */
function RealDirectory(path) {
  RealItem.call(this);

  this._path = path;
}
util.inherits(RealDirectory, RealItem);

/**
 * Add an item to the directory.
 * @param {string} name The name to give the item.
 * @param {Item} item The item to add.
 * @return {Item} The added item.
 */
RealDirectory.prototype.addItem = function (name, item) {
  if (this._items.hasOwnProperty(name)) {
    throw new Error("Item with the same name already exists: " + name);
  }
  this._items[name] = item;
  ++item.links;
  if (item instanceof RealDirectory) {
    // for '.' entry
    ++item.links;
    // for subdirectory
    ++this.links;
  }
  this.setMTime(new Date());
  return item;
};

/**
 * Get a named item.
 * @param {string} name Item name.
 * @return {Item} The named item (or null if none).
 */
RealDirectory.prototype.getItem = function (name) {
  const fullPath = path.resolve(this._path, name);

  return bypass(() => {
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        return new RealDirectory(fullPath);
      } else {
        return new RealFile(fullPath);
      }
    } catch (e) {
      return null;
    }
  });
};

/**
 * Remove an item.
 * @param {string} name Name of item to remove.
 * @return {Item} The orphan item.
 */
RealDirectory.prototype.removeItem = function (name) {
  if (!this._items.hasOwnProperty(name)) {
    throw new Error("Item does not exist in directory: " + name);
  }
  const item = this._items[name];
  delete this._items[name];
  --item.links;
  if (item instanceof RealDirectory) {
    // for '.' entry
    --item.links;
    // for subdirectory
    --this.links;
  }
  this.setMTime(new Date());
  return item;
};

/**
 * Get list of item names in this directory.
 * @return {Array<string>} Item names.
 */
RealDirectory.prototype.list = function () {
  return bypass(() => fs.readdirsync(this._path));
};

/**
 * Get directory stats.
 * @param {bolean} bigint Use BigInt.
 * @return {object} Stats properties.
 */
// RealDirectory.prototype.getStats = function (bigint) {
//   const stats = RealItem.prototype.getStats.call(this, bigint);
//   const convert = bigint ? (v) => BigInt(v) : (v) => v;

//   stats[1] = convert(this.getMode() | constants.S_IFDIR); // mode
//   stats[8] = convert(1); // size
//   stats[9] = convert(1); // blocks

//   return stats;
// };

/**
 * Export the constructor.
 * @type {function()}
 */
module.exports = RealDirectory;
