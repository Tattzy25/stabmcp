if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Blob {
    constructor(chunks, name, opts = {}) {
      super(chunks, opts);
      this.name = String(name);
      this.lastModified = opts.lastModified || Date.now();
      this.webkitRelativePath = '';
    }
    get [Symbol.toStringTag]() {
      return 'File';
    }
  };
}