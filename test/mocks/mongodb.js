class MockCollection {
  constructor(collectionName) {
    this.documents = new Map();
    this.collectionName = collectionName;
  }

  async insertOne(doc) {
    this.documents.set(doc.id, { ...doc });
    return { insertedId: doc.id };
  }

  async insertMany(docs) {
    const insertedIds = [];
    docs.forEach((doc) => {
      this.documents.set(doc.id, { ...doc });
      insertedIds.push(doc.id);
    });
    return { insertedIds };
  }

  async findOne(filter) {
    if ('id' in filter) {
      return this.documents.get(filter.id) || null;
    }

    // Simple filter implementation for other cases
    for (const doc of this.documents.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (doc[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) return doc;
    }

    return null;
  }

  find(filter) {
    const results = [];

    if (!filter || Object.keys(filter).length === 0) {
      results.push(...Array.from(this.documents.values()));
    } else {
      for (const doc of this.documents.values()) {
        let matches = true;
        for (const [key, value] of Object.entries(filter)) {
          if (doc[key] !== value) {
            matches = false;
            break;
          }
        }
        if (matches) results.push(doc);
      }
    }

    return {
      toArray: async () => results,
    };
  }

  async updateOne(filter, update) {
    const doc = await this.findOne(filter);
    if (!doc) {
      return { matchedCount: 0, modifiedCount: 0 };
    }

    if (update.$set) {
      Object.assign(doc, update.$set);
    }

    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter, update) {
    const docs = await this.find(filter);
    let modifiedCount = 0;

    for (const doc of docs) {
      if (update.$set) {
        Object.assign(doc, update.$set);
        modifiedCount++;
      }
    }

    return { matchedCount: docs.length, modifiedCount };
  }

  async deleteOne(filter) {
    const doc = await this.findOne(filter);
    if (!doc) {
      return { deletedCount: 0 };
    }

    this.documents.delete(doc.id);
    return { deletedCount: 1 };
  }

  async deleteMany(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      const count = this.documents.size;
      this.documents.clear();
      return { deletedCount: count };
    }

    const docs = await this.find(filter);
    for (const doc of docs) {
      this.documents.delete(doc.id);
    }

    return { deletedCount: docs.length };
  }

  async bulkWrite(operations) {
    const results = [];
    for (const op of operations) {
      if (op.insertOne) {
        await this.insertOne(op.insertOne.document);
        results.push({ insertedId: op.insertOne.document.id });
      } else if (op.updateOne) {
        await this.updateOne(op.updateOne.filter, op.updateOne.update);
        results.push({ matchedCount: 1, modifiedCount: 1 });
      } else if (op.deleteOne) {
        await this.deleteOne(op.deleteOne.filter);
        results.push({ deletedCount: 1 });
      }
    }
    return { result: results };
  }
}

class MockDb {
  constructor(dbName) {
    this.collections = new Map();
    this.dbName = dbName;
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
}

class MockMongoClient {
  constructor(_uri) {
    this.dbs = new Map();
    this.isConnected = false;
    // Initialize with empty databases
  }

  async connect() {
    this.isConnected = true;
  }

  async close() {
    this.isConnected = false;
  }

  db(name) {
    const dbName = name || 'default';
    if (!this.dbs.has(dbName)) {
      this.dbs.set(dbName, new MockDb(dbName));
    }
    return this.dbs.get(dbName);
  }
}

export { MockCollection, MockDb, MockMongoClient };
