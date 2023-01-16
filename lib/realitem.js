"use strict";

const bypass = require("./bypass");
const fs = require("fs");

const fsBinding = process.binding("fs");
const statsConstructor = fsBinding.statValues
  ? fsBinding.statValues.constructor
  : Float64Array;
// Nodejs v18.7.0 changed bigint stats type from BigUint64Array to BigInt64Array
// https://github.com/nodejs/node/pull/43714
const bigintStatsConstructor = fsBinding.bigintStatValues
  ? fsBinding.bigintStatValues.constructor
  : BigUint64Array;

let counter = 0;

/**
 * Permissions.
 * @enum {number}
 */
const permissions = {
  USER_READ: 256, // 0400
  USER_WRITE: 128, // 0200
  USER_EXEC: 64, // 0100
  GROUP_READ: 32, // 0040
  GROUP_WRITE: 16, // 0020
  GROUP_EXEC: 8, // 0010
  OTHER_READ: 4, // 0004
  OTHER_WRITE: 2, // 0002
  OTHER_EXEC: 1, // 0001
};

function getUid() {
  // force 0 on windows.
  return process.getuid ? process.getuid() : 0;
}

function getGid() {
  // force 0 on windows.
  return process.getgid ? process.getgid() : 0;
}

/**
 * A filesystem item.
 * @class
 */
function RealItem(path) {
  this._path = path;
}

/**
 * Add execute if read allowed
 * See notes in index.js -> mapping#addDir
 * @param {number} mode The file mode.
 * @return {number} The modified mode.
 */
RealItem.fixWin32Permissions = (mode) =>
  process.platform !== "win32"
    ? mode
    : mode |
      (mode & permissions.USER_READ && permissions.USER_EXEC) |
      (mode & permissions.GROUP_READ && permissions.GROUP_EXEC) |
      (mode & permissions.OTHER_READ && permissions.OTHER_EXEC);

/**
 * Determine if the current user has read permission.
 * @return {boolean} The current user can read.
 */
RealItem.prototype.canRead = function () {
  const uid = getUid();
  const gid = getGid();
  let can = false;
  const mode = this.getMode();
  if (process.getuid && uid === 0) {
    can = true;
  } else if (uid === this.getUid()) {
    can = (permissions.USER_READ & mode) === permissions.USER_READ;
  } else if (gid === this.getGid()) {
    can = (permissions.GROUP_READ & mode) === permissions.GROUP_READ;
  } else {
    can = (permissions.OTHER_READ & mode) === permissions.OTHER_READ;
  }
  return can;
};

/**
 * Determine if the current user has write permission.
 * @return {boolean} The current user can write.
 */
RealItem.prototype.canWrite = function () {
  const uid = getUid();
  const gid = getGid();
  let can = false;
  const mode = this.getMode();
  if (process.getuid && uid === 0) {
    can = true;
  } else if (uid === this.getUid()) {
    can = (permissions.USER_WRITE & mode) === permissions.USER_WRITE;
  } else if (gid === this.getGid()) {
    can = (permissions.GROUP_WRITE & mode) === permissions.GROUP_WRITE;
  } else {
    can = (permissions.OTHER_WRITE & mode) === permissions.OTHER_WRITE;
  }
  return can;
};

/**
 * Determine if the current user has execute permission.
 * @return {boolean} The current user can execute.
 */
RealItem.prototype.canExecute = function () {
  const uid = getUid();
  const gid = getGid();
  let can = false;
  const mode = this.getMode();
  if (process.getuid && uid === 0) {
    can = true;
  } else if (uid === this.getUid()) {
    can = (permissions.USER_EXEC & mode) === permissions.USER_EXEC;
  } else if (gid === this.getGid()) {
    can = (permissions.GROUP_EXEC & mode) === permissions.GROUP_EXEC;
  } else {
    can = (permissions.OTHER_EXEC & mode) === permissions.OTHER_EXEC;
  }
  return can;
};

/**
 * Get access time.
 * @return {Date} Access time.
 */
RealItem.prototype.getATime = function () {
  return bypass(() => fs.statSync(this._path).atime);
};

/**
 * Set access time.
 * @param {Date} atime Access time.
 */
RealItem.prototype.setATime = function (atime) {
  // TODO: implement this
  this._atime = atime;
};

/**
 * Get change time.
 * @return {Date} Change time.
 */
RealItem.prototype.getCTime = function () {
  return bypass(() => fs.statSync(this._path).ctime);
};

/**
 * Set change time.
 * @param {Date} ctime Change time.
 */
RealItem.prototype.setCTime = function (ctime) {
  // TODO: implement this
  this._ctime = ctime;
};

/**
 * Get birth time.
 * @return {Date} Birth time.
 */
RealItem.prototype.getBirthtime = function () {
  return bypass(() => fs.statSync(this._path).birthtime);
};

/**
 * Set change time.
 * @param {Date} birthtime Birth time.
 */
RealItem.prototype.setBirthtime = function (birthtime) {
  // TODO: implement this
  this._birthtime = birthtime;
};

/**
 * Get modification time.
 * @return {Date} Modification time.
 */
RealItem.prototype.getMTime = function () {
  return bypass(() => fs.statSync(this._path).mtime);
};

/**
 * Set modification time.
 * @param {Date} mtime Modification time.
 */
RealItem.prototype.setMTime = function (mtime) {
  // TODO: implement this
  this._mtime = mtime;
};

/**
 * Get mode (permission only, e.g 0666).
 * @return {number} Mode.
 */
RealItem.prototype.getMode = function () {
  return bypass(() => fs.statSync(this._path).mode);
};

/**
 * Set mode (permission only, e.g 0666).
 * @param {Date} mode Mode.
 */
RealItem.prototype.setMode = function (mode) {
  bypass(() => {
    fs.chmodSync(this._path, mode);
  });
};

/**
 * Get user id.
 * @return {number} User id.
 */
RealItem.prototype.getUid = function () {
  return bypass(() => fs.statSync(this._path).uid);
};

/**
 * Set user id.
 * @param {number} uid User id.
 */
RealItem.prototype.setUid = function (uid) {
  bypass(() => {
    const stat = fs.statSync(this._path);
    fs.chownSync(this._path, uid, stat.gid);
  });
};

/**
 * Get group id.
 * @return {number} Group id.
 */
RealItem.prototype.getGid = function () {
  return bypass(() => fs.statSync(this._path).gid);
};

/**
 * Set group id.
 * @param {number} gid Group id.
 */
RealItem.prototype.setGid = function (gid) {
  bypass(() => {
    const stat = fs.statSync(this._path);
    fs.chownSync(this._path, stat.uid, gid);
  });
};

/**
 * Get item stats.
 * @param {boolean} bigint Use BigInt.
 * @return {object} Stats properties.
 */
RealItem.prototype.getStats = function (bigint) {
  //   const stats = bigint
  //     ? new bigintStatsConstructor(36)
  //     : new statsConstructor(36);
  //   let statsFromFs = bypass(() => fs.statSync(this._path, { bigint }));

  //   stats[0] = statsFromFs.dev;
  //   stats[1] = statsFromFs.mode;
  //   stats[2] = statsFromFs.nlink;
  //   stats[3] = statsFromFs.uid;
  //   stats[4] = statsFromFs.gid;
  //   stats[5] = statsFromFs.rdev;
  //   stats[6] = statsFromFs.blksize;
  //   stats[7] = statsFromFs.ino;
  //   stats[6] = statsFromFs.size;
  //   stats[7] = statsFromFs.blocks;
  //   stats[10] = statsFromFs.atime;
  //   stats[11] = statsFromFs.atimeNs;
  //   stats[12] = statsFromFs.mtime;
  //   stats[13] = statsFromFs.mtimeNs;
  //   stats[14] = statsFromFs.ctime;
  //   stats[15] = statsFromFs.ctimeNs;
  //   stats[16] = statsFromFs.birthtime;
  //   stats[17] = statsFromFs.birthtimeNs;
  //   console.log(stats);
  //   return stats;
  const stats = bigint
    ? new bigintStatsConstructor(36)
    : new statsConstructor(36);
  const convert = bigint ? (v) => BigInt(v) : (v) => v;
  let statsFromFs = bypass(() => fs.statSync(this._path, { bigint }));

  // stats[0] = convert(8675309); // dev
  // // [1] is mode
  // stats[2] = convert(this.links); // nlink
  // stats[3] = convert(this.getUid()); // uid
  // stats[4] = convert(this.getGid()); // gid
  // stats[5] = convert(0); // rdev
  // stats[6] = convert(4096); // blksize
  // stats[7] = convert(108425494); // ino // TODO
  // // [8] is size
  // // [9] is blocks
  // const atimeMs = +this.getATime();
  // stats[10] = convert(Math.floor(atimeMs / 1000)); // atime seconds
  // stats[11] = convert((atimeMs % 1000) * 1000000); // atime nanoseconds
  // const mtimeMs = +this.getMTime();
  // stats[12] = convert(Math.floor(mtimeMs / 1000)); // atime seconds
  // stats[13] = convert((mtimeMs % 1000) * 1000000); // atime nanoseconds
  // const ctimeMs = +this.getCTime();
  // stats[14] = convert(Math.floor(ctimeMs / 1000)); // atime seconds
  // stats[15] = convert((ctimeMs % 1000) * 1000000); // atime nanoseconds
  // const birthtimeMs = +this.getBirthtime();
  // stats[16] = convert(Math.floor(birthtimeMs / 1000)); // atime seconds
  // stats[17] = convert((birthtimeMs % 1000) * 1000000); // atime nanoseconds
  stats[0] = statsFromFs.dev;
  stats[1] = statsFromFs.mode;
  stats[2] = statsFromFs.nlink;
  stats[3] = statsFromFs.uid;
  stats[4] = statsFromFs.gid;
  stats[5] = statsFromFs.rdev;
  stats[6] = statsFromFs.blksize;
  stats[7] = statsFromFs.ino;
  stats[8] = statsFromFs.size;
  stats[9] = statsFromFs.blocks;
  stats[10] = statsFromFs.atime;
  stats[11] = statsFromFs.atimeNs;
  stats[12] = statsFromFs.mtime;
  stats[13] = statsFromFs.mtimeNs;
  stats[14] = statsFromFs.ctime;
  stats[15] = statsFromFs.ctimeNs;
  stats[16] = statsFromFs.birthtime;
  stats[17] = statsFromFs.birthtimeNs;

  return stats;
};

/**
 * Get the item's string representation.
 * @return {string} String representation.
 */
RealItem.prototype.toString = function () {
  return "[" + this.constructor.name + "]";
};

/**
 * Export the constructor.
 * @type {function()}
 */
module.exports = RealItem;
