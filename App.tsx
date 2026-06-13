import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { open } from '@op-engineering/op-sqlite';

const DATABASE_NAME = 'unicode-roundtrip.sqlite';
const TABLE_NAME = 'op_sqlite_unicode_repro';

const expected = JSON.stringify({
  bullet: 'Kimball Wildlife Refuge • Burlingame State Park',
  smartQuotes: 'John “Jack” Doe',
});

type ReproState =
  | { status: 'running' }
  | {
      status: 'done';
      expected: string;
      actual: string | undefined;
      matches: boolean;
      expectedCodeUnits: string;
      actualCodeUnits: string | undefined;
    }
  | { status: 'error'; message: string };

function App() {
  const [state, setState] = useState<ReproState>({ status: 'running' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const db = open({ name: DATABASE_NAME });

        await db.execute(
          `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (value TEXT)`,
        );
        await db.execute(`DELETE FROM ${TABLE_NAME}`);
        await db.execute(`INSERT INTO ${TABLE_NAME} (value) VALUES (?)`, [
          expected,
        ]);

        const result = await db.execute(`SELECT value FROM ${TABLE_NAME}`);
        const actual = result.rows[0]?.value as string | undefined;

        if (!cancelled) {
          setState({
            status: 'done',
            expected,
            actual,
            matches: actual === expected,
            expectedCodeUnits: codeUnits(expected),
            actualCodeUnits: actual == null ? undefined : codeUnits(actual),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.stack ?? error.message : String(error),
          });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>op-sqlite Unicode Roundtrip</Text>
        <Text style={styles.subtitle}>
          Writes a JSON string through a bound SQLite parameter, then reads it
          back.
        </Text>

        {state.status === 'running' ? (
          <View style={styles.running}>
            <ActivityIndicator />
            <Text style={styles.body}>Running repro...</Text>
          </View>
        ) : null}

        {state.status === 'error' ? (
          <Block title="Error" tone="bad" value={state.message} />
        ) : null}

        {state.status === 'done' ? (
          <>
            <View style={[styles.result, state.matches ? styles.pass : styles.fail]}>
              <Text style={styles.resultText}>
                {state.matches ? 'PASS: string roundtripped' : 'FAIL: string was corrupted'}
              </Text>
            </View>

            <Block title="Expected" value={state.expected} />
            <Block title="Actual" value={visibleControlCharacters(state.actual)} />
            <Block title="Expected UTF-16 Code Units" value={state.expectedCodeUnits} />
            <Block
              title="Actual UTF-16 Code Units"
              value={state.actualCodeUnits}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | undefined;
  tone?: 'bad';
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={[styles.code, tone === 'bad' ? styles.badText : undefined]}>
        {value ?? '<undefined>'}
      </Text>
    </View>
  );
}

function visibleControlCharacters(value: string | undefined) {
  if (value == null) return undefined;

  return [...value]
    .map(char => {
      const code = char.charCodeAt(0);
      return code < 32 ? `<0x${code.toString(16).padStart(2, '0')}>` : char;
    })
    .join('');
}

function codeUnits(value: string) {
  return [...value]
    .map(char => char.charCodeAt(0).toString(16).padStart(4, '0'))
    .join(' ');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    color: '#111',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#555',
    fontSize: 15,
    lineHeight: 21,
  },
  running: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  body: {
    color: '#333',
    fontSize: 15,
  },
  result: {
    borderRadius: 8,
    padding: 12,
  },
  pass: {
    backgroundColor: '#d9f7df',
  },
  fail: {
    backgroundColor: '#ffe1e1',
  },
  resultText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
  block: {
    gap: 6,
  },
  blockTitle: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  code: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderRadius: 6,
    borderWidth: 1,
    color: '#111',
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
  badText: {
    color: '#9b111e',
  },
});

export default App;
