# op-sqlite string roundtrip issue

Minimal React Native reproduction for a Unicode string corruption issue in
`@op-engineering/op-sqlite@16.2.1`.

The app writes this JSON string through a bound SQLite parameter:

```ts
JSON.stringify({
  bullet: 'Kimball Wildlife Refuge • Burlingame State Park',
  smartQuotes: 'John “Jack” Doe',
})
```

Then it reads the value back and displays whether the string roundtripped.

## Expected

The selected value should match the inserted value:

```json
{"bullet":"Kimball Wildlife Refuge • Burlingame State Park","smartQuotes":"John “Jack” Doe"}
```

## Actual with op-sqlite 16.2.1

The selected value is corrupted:

```text
{"bullet":"Kimball Wildlife Refuge " Burlingame State Park","smartQuotes":"John <0x1c>Jack<0x1d> Doe"}
```

The byte/code-unit pattern matches truncating UTF-16 code units:

```text
U+2022 BULLET       -> 0x22
U+201C LEFT QUOTE   -> 0x1c
U+201D RIGHT QUOTE  -> 0x1d
```

## Running

```sh
npm install
npm run ios
```

For iOS, install pods first if the React Native CLI does not do it for you:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

## Comparing 16.2.0

`16.2.0` appears not to have the issue. To compare:

```sh
npm install @op-engineering/op-sqlite@16.2.0
cd ios
bundle exec pod install
cd ..
npm run ios
```

The app should show `PASS: string roundtripped` when the selected value matches
the inserted value.
