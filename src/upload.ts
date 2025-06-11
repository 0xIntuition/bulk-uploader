import { toHex, formatEther } from 'viem'
import { contract, account, publicClient } from './setup'

const randomDid = () => `did:example:${Math.floor(Math.random() * 900000000) + 100000000}`

const estimateOptimalBatchSize = async (sampleSize = 10): Promise<number> => {
  try {
    // Test with a small batch to estimate gas per atom
    const testDids = Array.from({ length: sampleSize }, () => toHex(randomDid()))
    const gasEstimate = await contract.estimateGas.batchCreateAtom([testDids], {
      account: account.address,
      value: await contract.read.getAtomCost() * BigInt(sampleSize),
    })

    // Get current gas limit (usually 30M for most chains)
    const block = await publicClient.getBlock()
    const blockGasLimit = block.gasLimit

    // Use 80% of block gas limit as safety margin
    const safeGasLimit = blockGasLimit * 80n / 100n

    // Calculate gas per atom and optimal batch size
    const gasPerAtom = gasEstimate / BigInt(sampleSize)
    const optimalBatchSize = Number(safeGasLimit / gasPerAtom)

    console.log(`Gas per atom: ${gasPerAtom}`)
    console.log(`Block gas limit: ${blockGasLimit}`)
    console.log(`Optimal batch size: ${optimalBatchSize}`)

    return optimalBatchSize
  } catch (error) {
    console.warn('Could not estimate optimal batch size, using conservative default of 50')
    return 50
  }
}

type BatchResult = {
  batchIndex: number
  atomCount: number
  txHash?: `0x${string}`
  error?: any
}

const batchCreateAtoms = async (totalCount: number, batchSize: number): Promise<BatchResult[]> => {
  const atomCost = await contract.read.getAtomCost()
  const totalCost = atomCost * BigInt(totalCount)

  console.log(`Creating ${totalCount} atoms in batches of ${batchSize}`)
  console.log(`Total cost: ${formatEther(totalCost)} ETH`)

  const results: BatchResult[] = []

  for (let i = 0; i < totalCount; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, totalCount - i)
    const dids = Array.from({ length: currentBatchSize }, () => toHex(randomDid()))

    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalCount / batchSize)} (${currentBatchSize} atoms)`)

    try {
      const txHash = await contract.write.batchCreateAtom([dids], {
        account: account.address,
        value: atomCost * BigInt(currentBatchSize),
      })

      console.log(`Batch ${Math.floor(i / batchSize) + 1} transaction: ${txHash}`)
      results.push({ batchIndex: Math.floor(i / batchSize) + 1, txHash, atomCount: currentBatchSize })

      // Small delay between batches to avoid nonce issues
      // await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (err) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`)

      console.error(err)

      // Continue with next batch instead of failing completely
      results.push({ batchIndex: Math.floor(i / batchSize) + 1, error: err, atomCount: currentBatchSize })
    }
  }

  return results
}

const main = async () => {
  const atomCount = 1000

  // Determine optimal batch size
  const optimalBatchSize = await estimateOptimalBatchSize()

  // Execute batched creation
  const results = await batchCreateAtoms(atomCount, optimalBatchSize)

  // Summary
  const successful = results.filter(r => r.txHash)
  const failed = results.filter(r => r.error)

  console.log(`\n=== Summary ===`)
  console.log(`Total batches: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Failed: ${failed.length}`)
  console.log(`Total atoms created: ${successful.reduce((sum, r) => sum + r.atomCount, 0)}`)
}

main().catch(console.error)