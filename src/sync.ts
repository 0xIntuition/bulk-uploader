import { RecordId, Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';
import { getPositions } from './graphql';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SURREAL_URL || typeof process.env.SURREAL_URL !== 'string') {
  throw new Error('SURREAL_URL is not set');
}

// Enable the WebAssembly engines
const db = new Surreal({
  engines: surrealdbNodeEngines(),
});

const main = async () => {
  // Now we can start SurrealDB as an in-memory database
  // await db.connect("mem://");
  // Or we can start a persisted SurrealKV database
  // await db.connect("surrealkv://demo.db", {
  //   database: 'test',
  //   namespace: 'test',
  // });
  // Or a persisted SurrealKV database with versioning (temoral queries)
  // await db.connect("surrealkv+versioned://demo");

  await db.connect(process.env.SURREAL_URL as string, {
    auth: {
      username: 'root',
      password: 'root',
    },
    database: 'test',
    namespace: 'test',
  });

  // Now use the JavaScript SDK as normal.
  type Atom = {
    term_id: string;
    label: string;
    type: string;
    data: string;
  };

  // const address = '0x19711CD19e609FEBdBF607960220898268B7E24b'; // simon
  const address = '0x88D0aF73508452c1a453356b3Fac26525aEc23A2'; // billy

  console.log('syncing positions for', address);
  console.time('getPositions');
  const positions = await getPositions(address);
  console.timeEnd('getPositions');

  console.log('upserting atoms');

  await db.query('DEFINE TABLE atom;');
  await db.query('DEFINE FIELD term_id ON TABLE atom;');
  await db.query('DEFINE FIELD label ON TABLE atom;');
  await db.query('DEFINE FIELD type ON TABLE atom;');
  await db.query('DEFINE FIELD data ON TABLE atom;');

  console.time('upsertAtoms');
  for (const position of positions) {
    if (position.term.atom) {
      const atom = await db.upsert<Atom>(new RecordId('atom', position.term.id), {
        term_id: position.term.atom.term_id,
        label: position.term.atom.label,
        type: position.term.atom.type,
        data: position.term.atom.data,
      });
      // console.log(atom);
    }
    if (position.term.triple) {
      // upsert subject, predicate, object
      const subject = await db.upsert<Atom>(new RecordId('atom', position.term.triple.subject.term_id), {
        term_id: position.term.triple.subject.term_id,
        label: position.term.triple.subject.label,
        type: position.term.triple.subject.type,
        data: position.term.triple.subject.data,
      });
      const predicate = await db.upsert<Atom>(new RecordId('atom', position.term.triple.predicate.term_id), {
        term_id: position.term.triple.predicate.term_id,
        label: position.term.triple.predicate.label,
        type: position.term.triple.predicate.type,
        data: position.term.triple.predicate.data,
      });
      const object = await db.upsert<Atom>(new RecordId('atom', position.term.triple.object.term_id), {
        term_id: position.term.triple.object.term_id,
        label: position.term.triple.object.label,
        type: position.term.triple.object.type,
        data: position.term.triple.object.data,
      });

      await db.query(`RELATE atom:\`${position.term.triple.subject.term_id}\` -> \`${position.term.triple.predicate.label}\`:\`${position.term.id}\` -> atom:\`${position.term.triple.object.term_id}\``);
    }
  }
  console.timeEnd('upsertAtoms');

  console.log('done syncing positions', positions.length);


  // Close the database connection
  await db.close();
};

main().catch(console.error);