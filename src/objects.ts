import { toHex, formatEther, parseEventLogs } from 'viem'
import { contract, account, publicClient } from './setup'
import { getAtomByData } from './graphql';
import { abi } from './abi'
const data = [
  {
    "id": "did:example:123",
    "name": "Alice Smith",
    "url": "https://example.com/alice",
    "has tag": ["tag1", "tag2"]
  },
  {
    "id": "did:example:456",
    "name": "Bob",
    "url": "https://example.com/bob",
    "has tag": ["tag2", "tag3"]
  }
]



const main = async () => {
  const atomCost = await contract.read.getAtomCost()

  async function getOrCreateAtom(data: string) {
    const atom = await getAtomByData(data)
    if (atom) {
      return BigInt(atom)
    }
    const hash = await contract.write.createAtom([toHex(data)], {
      account: account.address,
      value: atomCost,
    })
    const { logs, status } =
      await publicClient.waitForTransactionReceipt({ hash })

    if (status === 'reverted') {
      throw new Error('Transaction reverted')
    }

    const atomCreatedEvents = parseEventLogs({
      abi,
      logs,
      eventName: 'AtomCreated',
    })

    const vaultId = atomCreatedEvents[0].args.vaultId

    return BigInt(vaultId)
  }

  async function getTripleIdFromAtoms(subjectId: bigint, predicateId: bigint, objectId: bigint) {
    const tripleHash = await contract.read.tripleHashFromAtoms([
      subjectId,
      predicateId,
      objectId,
    ])

    const tripleId = await contract.read.triplesByHash([tripleHash])
    if (tripleId === 0n) {
      return null
    }
    return BigInt(tripleId)
  }

  async function getCreateOrDepositOnTriple(subjectId: bigint, predicateId: bigint, objectId: bigint) {
    const generalConfig = await contract.read.generalConfig()
    const initialDeposit = generalConfig[3]



    const vaultId = await getTripleIdFromAtoms(subjectId, predicateId, objectId)
    if (vaultId) {
      if (initialDeposit) {
        console.log(`Depositing triple: ${subjectId} ${predicateId} ${objectId} ${initialDeposit} ...`)
        const hash = await contract.write.depositTriple([account.address, vaultId], {
          account: account.address,
          value: initialDeposit,
        })
        await publicClient.waitForTransactionReceipt({ hash })
      }
      return { vaultId, hash: null }
    } else {
      console.log(`Creating triple: ${subjectId} ${predicateId} ${objectId} ...`)
      const hash = await contract.write.createTriple([subjectId, predicateId, objectId], {
        account: account.address,
        value: initialDeposit,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return { vaultId, hash }
    }
  }

  for (const item of data) {
    const id = item.id
    const keys = Object.keys(item)
    const values = Object.values(item)

    console.log('creating atom', id)

    const idAtom = await getOrCreateAtom(id)

    for (const key of keys) {
      if (key === 'id') continue
      console.log('creating atom', key)

      const keyAtom = await getOrCreateAtom(key)


      const value = values[keys.indexOf(key)]
      if (Array.isArray(value)) {
        for (const v of value) {
          console.log('creating atom', v)
          const vAtom = await getOrCreateAtom(v)
          await getCreateOrDepositOnTriple(idAtom, keyAtom, vAtom)
        }
      } else {
        console.log('creating atom', value)
        const valueAtom = await getOrCreateAtom(value)
        await getCreateOrDepositOnTriple(idAtom, keyAtom, valueAtom)
      }
    }


  }

}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
});