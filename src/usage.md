# Example

## Set data

```ts
import { intuition } from '@/lib/intuition';
import { account } from '@/lib/account';

await intuition.setActiveAccount(account.address);

const data = [
  {
    "id": "did:example:123",
    "name": "Alice",
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

await intuition.set(data);
await intuition.sync();

```

This will make sure that the active account has positions on the following triples. It will create missing atoms and triples if necessary:

```
did:example:123 -> name -> "Alice"
did:example:123 -> url -> "https://example.com/alice"
did:example:123 -> has tag -> "tag1"
did:example:123 -> has tag -> "tag2"

did:example:456 -> name -> "Bob"
did:example:456 -> url -> "https://example.com/bob"
did:example:456 -> has tag -> "tag2"
did:example:456 -> has tag -> "tag3"
```

## Get data

```ts
const query = '???'
const data = await intuition.execute(query);

console.log(data);
```


This will return the following data:

```json
[
  {
    "id": "did:example:123",
    "name": "Alice",
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
```

## Update data

```ts
const data = [
  {
    "id": "did:example:123",
    "name": "Alice Smith",
  }
]
await intuition.set(data);
await intuition.sync();
```

This will make sure that the active account has positions on the following triples. It will create missing atoms and triples if necessary. 

```
did:example:123 -> name -> "Alice Smith"
```

It will also make sure that the active account has no positions on the following triples:

```
did:example:123 -> url -> "https://example.com/alice"
did:example:123 -> has tag -> "tag1"
did:example:123 -> has tag -> "tag2"
```


# Query updated data

```ts
const query = '???'
const data = await intuition.execute(query);
console.log(data);
```

This will return the following data:

```json
[
  {
    "id": "did:example:123",
    "name": "Alice Smith",
  },
  {
    "id": "did:example:456",
    "name": "Bob",
    "url": "https://example.com/bob",
    "has tag": ["tag2", "tag3"]
  }
]
```