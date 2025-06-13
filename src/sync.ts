import { RecordId, Surreal } from 'surrealdb';
import { surrealdbNodeEngines } from '@surrealdb/node';
import { PositionsResult, syncPositions } from './graphql';
import dotenv from 'dotenv';
import { getAddress } from 'viem';

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

  const address = '0x19711CD19e609FEBdBF607960220898268B7E24b'; // simon
  //const address = '0x88D0aF73508452c1a453356b3Fac26525aEc23A2'; // billy

  const sync = async (positions: PositionsResult['positions']) => {
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

        // Check if the relation already exists
        const relation: any = await db.query(`SELECT * FROM \`${position.term.triple.predicate.label}\` WHERE id = \`${position.term.triple.predicate.label}\`:\`${position.term.id}\``);
        if (relation[0].length > 0) {
          // update the relation
          await db.query(`UPDATE \`${position.term.triple.predicate.label}\`:\`${position.term.id}\` SET holders += '${position.account_id}'`);
        } else {
          // create the relation
          await db.query(`RELATE atom:\`${position.term.triple.subject.term_id}\` -> \`${position.term.triple.predicate.label}\`:\`${position.term.id}\` -> atom:\`${position.term.triple.object.term_id}\`
          CONTENT {
            holders: ['${position.account_id}'],
          }`);
        }


      }
    }
  }

  console.log('syncing positions for', address);

  console.time('total');
  // await syncPositions(sync, address);
  await syncPositions(sync);

  // get follwing
  // const following: any = await db.query(`SELECT ->atom.* as following from \`follow\` where in = atom:\`11\` and holders contains '${address}'`);
  // const res = following[0]
  // for (const item of res) {
  //   console.log('following', item.following);
  //   const followingAddress = getAddress(item.following[0].data);
  //   console.log('syncing positions for', followingAddress);
  //   await syncPositions(sync, followingAddress);
  // }



  console.timeEnd('total');


  // Close the database connection
  await db.close();
};

main().catch(console.error);