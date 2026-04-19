import { useEffect, useState } from 'react';
import { getDb } from '../lib/db';
import type { Phrase } from '@wsb/shared';

const CATEGORIES = ['Greetings', 'Directions', 'Food', 'Emergency', 'Shopping', 'Transportation'] as const;

const DEFAULT_PHRASES: Phrase[] = [
  // Greetings
  { id: 'g1', category: 'Greetings', english: 'Hello', chinese: '你好', pinyin: 'Nǐ hǎo' },
  { id: 'g2', category: 'Greetings', english: 'Thank you', chinese: '谢谢', pinyin: 'Xiè xiè' },
  { id: 'g3', category: 'Greetings', english: 'Goodbye', chinese: '再见', pinyin: 'Zài jiàn' },
  { id: 'g4', category: 'Greetings', english: 'Excuse me', chinese: '请问', pinyin: 'Qǐng wèn' },
  // Directions
  { id: 'd1', category: 'Directions', english: 'Where is…?', chinese: '…在哪里？', pinyin: '…zài nǎ lǐ?' },
  { id: 'd2', category: 'Directions', english: 'Turn left', chinese: '左转', pinyin: 'Zuǒ zhuǎn' },
  { id: 'd3', category: 'Directions', english: 'Turn right', chinese: '右转', pinyin: 'Yòu zhuǎn' },
  { id: 'd4', category: 'Directions', english: 'Go straight', chinese: '直走', pinyin: 'Zhí zǒu' },
  // Food
  { id: 'f1', category: 'Food', english: 'Menu, please', chinese: '请给我菜单', pinyin: 'Qǐng gěi wǒ càidān' },
  { id: 'f2', category: 'Food', english: 'The bill, please', chinese: '买单', pinyin: 'Mǎi dān' },
  { id: 'f3', category: 'Food', english: 'Water', chinese: '水', pinyin: 'Shuǐ' },
  { id: 'f4', category: 'Food', english: 'No spicy', chinese: '不要辣', pinyin: 'Bù yào là' },
  // Emergency
  { id: 'e1', category: 'Emergency', english: 'Help!', chinese: '救命！', pinyin: 'Jiù mìng!' },
  { id: 'e2', category: 'Emergency', english: 'Call the police', chinese: '报警', pinyin: 'Bào jǐng' },
  { id: 'e3', category: 'Emergency', english: 'I need a doctor', chinese: '我需要看医生', pinyin: 'Wǒ xūyào kàn yīshēng' },
  { id: 'e4', category: 'Emergency', english: 'Hospital', chinese: '医院', pinyin: 'Yī yuàn' },
  // Shopping
  { id: 's1', category: 'Shopping', english: 'How much?', chinese: '多少钱？', pinyin: 'Duō shǎo qián?' },
  { id: 's2', category: 'Shopping', english: 'Too expensive', chinese: '太贵了', pinyin: 'Tài guì le' },
  { id: 's3', category: 'Shopping', english: 'Can you give a discount?', chinese: '可以便宜一点吗？', pinyin: 'Kěyǐ piányi yīdiǎn ma?' },
  { id: 's4', category: 'Shopping', english: 'I want this', chinese: '我要这个', pinyin: 'Wǒ yào zhè ge' },
  // Transportation
  { id: 't1', category: 'Transportation', english: 'Taxi', chinese: '出租车', pinyin: 'Chūzū chē' },
  { id: 't2', category: 'Transportation', english: 'Airport', chinese: '机场', pinyin: 'Jī chǎng' },
  { id: 't3', category: 'Transportation', english: 'Hotel', chinese: '酒店', pinyin: 'Jiǔ diàn' },
  { id: 't4', category: 'Transportation', english: 'Train station', chinese: '火车站', pinyin: 'Huǒ chē zhàn' },
];

function speakChinese(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

export default function Phrasebook() {
  const [phrases, setPhrases] = useState<Phrase[]>(DEFAULT_PHRASES);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const db = await getDb();
      const cached = await db.getAll('phrasebook');
      if (cached.length > 0 && !cancelled) {
        setPhrases(cached);
      } else {
        // Seed default phrases into IndexedDB
        const tx = db.transaction('phrasebook', 'readwrite');
        for (const p of DEFAULT_PHRASES) {
          await tx.store.put(p);
        }
        await tx.done;
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const toggleCategory = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: phrases.filter((p) => p.category === cat),
  }));

  return (
    <div className="phrasebook-page" role="main" aria-label="Travel phrasebook">
      <h1 className="phrasebook-title">Phrasebook</h1>
      <div className="phrasebook-accordion">
        {grouped.map(({ category, items }) => (
          <div key={category} className="phrasebook-section">
            <button
              className={`phrasebook-section-header ${openCategory === category ? 'open' : ''}`}
              onClick={() => toggleCategory(category)}
              aria-expanded={openCategory === category}
              aria-controls={`phrasebook-${category}`}
            >
              <span>{category}</span>
              <span className="phrasebook-chevron" aria-hidden="true">
                {openCategory === category ? '▼' : '▶'}
              </span>
            </button>
            {openCategory === category && (
              <ul
                id={`phrasebook-${category}`}
                className="phrasebook-list"
                role="list"
                aria-label={`${category} phrases`}
              >
                {items.map((phrase) => (
                  <li key={phrase.id} className="phrasebook-item">
                    <div className="phrasebook-phrase">
                      <span className="phrasebook-en" lang="en">{phrase.english}</span>
                      <span className="phrasebook-cn" lang="zh-Hans">{phrase.chinese}</span>
                      <span className="phrasebook-pinyin">{phrase.pinyin}</span>
                    </div>
                    <button
                      className="phrasebook-speak-btn"
                      onClick={() => speakChinese(phrase.chinese)}
                      aria-label={`Speak ${phrase.english} in Chinese`}
                      title="Play pronunciation"
                    >
                      🔊
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
