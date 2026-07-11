import type { ApiClient } from './client'
import type { IssueResponse } from '../types/issue'
import type { ArchiveResponse } from '../types/archive'
import type { Settings, SettingsResponse, SettingsPatch } from '../types/settings'

export const STATUS: import('../types/status').AppStatus = {
  indexed: true, theme_count: 12, note_count: 1284, issue_count: 47,
  latest_issue_date: '2026-06-30', next_edition_at: null, delivery_time: '07:00', cadence_days: 1,
  active_jobs: [],
}

export const AMOR_FATI: IssueResponse = {
  id: 'fixture-47',
  issue_no: 47,
  issue_date: '2026-06-30',
  reading_min: 7,
  theme_label: 'Amor Fati',
  content: {
    title: 'Amor Fati',
    dek: "Today's edition · on acceptance, and the strange freedom in it",
    standfirst:
      "Three thinkers you've filed across the centuries — a Greek slave, " +
      'a Roman emperor, and a German with a moustache — turn out to be circling ' +
      'the same difficult instruction: want what happens.',
    sources: ['Amor Fati', 'The Dichotomy of Control', 'The Obstacle Is the Way'],
    lead:
      "here is a line of Nietzsche's you underlined twice and never returned to: that his " +
      'formula for greatness in a human being is amor fati — wanting nothing to be other than ' +
      'it is, not forward, not back, not in all eternity. It reads, at first, like surrender. ' +
      'Three of your notes, filed years and centuries apart, quietly insist it is the opposite.\n\n' +
      'The oldest of the three is a Greek who began life enslaved. Epictetus opens his handbook ' +
      'with a single distinction he thinks will decide everything: some things are within our ' +
      'power, and some are not. Our opinions, our desires, our own actions are ours. Our bodies, ' +
      'our reputations, our circumstances are not. Nearly all human misery, he argues, comes from ' +
      'staking our peace on the second kind.\n\n' +
      '## Freedom as a narrowing\n\n' +
      'This is a strange definition of freedom — not the widening of what you can have, but the ' +
      'narrowing of what you allow yourself to want. The free person, for Epictetus, is not the ' +
      'one with the most options but the one who has stopped pinning their contentment to things ' +
      'they cannot move. You are sovereign over exactly the territory that is genuinely yours, and ' +
      'a beggar everywhere you reach past it.\n\n' +
      'Two centuries later a Roman emperor — of all people — writes the same idea into a private ' +
      'notebook never meant for us to read. Marcus Aurelius had every option a human being could ' +
      'want, and spent his nights reminding himself they were borrowed. “The impediment to ' +
      'action advances action,” he tells himself. “What stands in the way becomes the ' +
      'way.” The obstacle is not the interruption of the path; on the hard days, it is the ' +
      'path.\n\n' +
      '> It is not events that disturb us, but our judgements about events.\n\n' +
      'Then Nietzsche, who despised a great deal about the Stoics, arrives at their doorstep by a ' +
      'different road. His amor fati is not resignation but appetite — to love your fate so ' +
      'completely that, offered the chance to live this same life again, every loss and ' +
      'humiliation and wrong turn included, eternally, you would say yes, and mean it. The test he ' +
      'sets is brutal and clarifying. Would you take this again?\n\n' +
      '## The same instruction, three times\n\n' +
      'Read together, the slave, the emperor, and the philosopher are giving one instruction in ' +
      'three accents. Epictetus says: stop wanting what is not yours to control. Marcus says: use ' +
      'whatever arrives as your material. Nietzsche says: go further still — want it. The arc runs ' +
      'from acceptance, through use, to something that looks almost like gratitude.\n\n' +
      '- From Epictetus: stop spending your peace on what you cannot move.\n' +
      '- From Marcus: treat the obstacle as the assignment, not the interruption.\n' +
      '- From Nietzsche: aim past acceptance, toward wanting it again.\n\n' +
      "The objection is obvious, and you wrote it in the margin yourself: isn't this just a " +
      'sophisticated way of giving up? But none of the three counsels passivity. Epictetus fought, ' +
      'Marcus governed an empire at war, Nietzsche wrote like a man on fire. The instruction was ' +
      'never “do nothing.” It is “do everything you can, and then want the result ' +
      'you get.” Effort and acceptance turn out not to be opposites but a sequence.\n\n' +
      'Which leaves the question the notes were always asking and never quite said aloud — not ' +
      'whether you can change your circumstances, because sometimes you can, but whether you ' +
      'could, if it came to it, love the life you actually have. Most of us are still negotiating. ' +
      'The three of them are suggesting that the negotiation is the unhappiness.',
    connections: [
      {
        flavor: 'discovery',
        a: 'Amor Fati',
        b: "Camus' Myth of Sisyphus",
        overlap: 'Affirmation in the face of a meaningless universe',
        text:
          'Both stare at the same fact — a cosmos that owes you no meaning — and answer ' +
          'with the same word: yes. The concept they share is affirmation; where they part ' +
          'is that Camus pushes past Stoic acceptance into revolt, insisting Sisyphus be ' +
          'imagined happy at his eternal boulder. The hidden relationship your notes never ' +
          'drew is that amor fati and the absurd hero are one gesture in two vocabularies, ' +
          'ancient and modern. Worth revisiting as a pair because each rescues the other ' +
          'from misreading — the Stoics save Camus from despair, Camus saves the Stoics ' +
          'from passivity.',
      },
      {
        flavor: 'reminder',
        a: 'The Dichotomy of Control',
        b: 'The Serenity Prayer',
        overlap: 'A triage of what is and isn’t yours to change',
        text:
          "You linked these once and let the thread lapse. Niebuhr's prayer — serenity to " +
          "accept what cannot change, courage to change what can, wisdom to tell them " +
          "apart — is almost a verbatim compression of Epictetus's dichotomy of control. " +
          'The relationship worth seeing is one of lineage: a 1930s sermon is quietly ' +
          'carrying first-century Stoicism into millions of modern rooms, unattributed. ' +
          'Revisit it and the cliche turns back into the sharp instrument it started as.',
      },
      {
        flavor: 'discovery',
        a: 'Eternal Recurrence',
        b: 'Memento Mori',
        overlap: 'The weight of the present moment',
        text:
          "You've never connected these, though they sit at opposite ends of one axis. " +
          'Memento mori says this ends, so attend to it; eternal recurrence says this ' +
          'repeats forever, so will it well — opposite premises, identical instruction ' +
          'about how to hold the present hour. The concept they share is the weight of ' +
          'now: both are devices for making an ordinary moment matter. Revisit them ' +
          'together and each stops reading as morbid and starts reading as practical.',
      },
      {
        flavor: 'discovery',
        a: "Spinoza's Deus sive Natura",
        b: 'The Stoic Logos',
        overlap: 'Necessity reframed as rational order',
        text:
          'Sixteen centuries apart, both recast necessity as the rational order of things ' +
          'rather than a tyranny to resent. The overlap is determinism softened into ' +
          'reverence: to grasp why each event had to follow from its causes is, for both, ' +
          'to stop railing at any single link in the chain. The link you\'d have missed is ' +
          "that Spinoza's 'God or Nature' is essentially the Stoic Logos rebuilt with " +
          'geometry. Worth revisiting if you\'ve ever mistaken acceptance for resignation — ' +
          'for both, understanding is the way out of anger.',
      },
      {
        flavor: 'reminder',
        a: 'Premeditatio malorum',
        b: 'Cognitive behavioural therapy',
        overlap: 'Rehearsing the feared thing to disarm it',
        text:
          "You flagged these as 'the same move, restated every few centuries,' and the " +
          'note deserves a second look. Stoic premeditatio malorum — rehearsing loss ' +
          'before it arrives — is structurally identical to the exposure and ' +
          'decatastrophising at the core of CBT. The shared mechanism is desensitisation: ' +
          'picture the feared thing in detail and it loosens its grip on you now. Revisit ' +
          'because one is two thousand years older than the other and they prescribe ' +
          'nearly the same exercise.',
      },
      {
        flavor: 'discovery',
        a: "Marcus's 'borrowed, not owned'",
        b: 'Buddhist anatta',
        overlap: 'Impermanence of the self as liberation',
        text:
          'With no possible contact between Rome and the Buddhist world, an emperor and ' +
          "the Buddha land on the same unsettling claim. Marcus's reminder that everything " +
          "is 'borrowed, not owned' rhymes precisely with anatta, the doctrine that there " +
          'is no permanent self to possess anything at all. The overlap is impermanence ' +
          'read as liberation rather than loss; the hidden link is two independent ' +
          'traditions reaching it by separate roads. Worth revisiting together as evidence ' +
          'that the insight is discovered, not merely invented.',
      },
    ],
    standalone_summaries: [
      {
        note: 'Amor Fati',
        source: '12 notes · Nietzsche',
        text:
          "Nietzsche's amor fati is the love of fate — not mere tolerance of what happens " +
          'but the active wish that your life, exactly as it was and is, recur eternally ' +
          'and unchanged. Your notes trace it from The Gay Science through Ecce Homo, ' +
          "where he names it his 'formula for greatness.' The pattern across the fragments " +
          'is that affirmation is a discipline, not a mood: it is practised against ' +
          'suffering, not in its absence. The tension you keep flagging is whether this is ' +
          'heroic or a denial of real grief — Nietzsche never fully resolves it. What ' +
          'survives every objection is the test itself: would you live this again? It is ' +
          'the sharpest single question in the file.',
      },
      {
        note: 'The Dichotomy of Control',
        source: '9 notes · Epictetus',
        text:
          'Epictetus opens the Enchiridion by splitting the world in two: what is up to ' +
          'us — judgement, desire, our own action — and what is not — body, reputation, ' +
          'circumstance, other people. The major idea is that freedom and peace come from ' +
          'wanting only the first set, and meeting the second without staking your ' +
          'contentment on it. Your notes tie this to his life as a former slave, which ' +
          'gives the doctrine its edge: inner freedom as the one territory no master can ' +
          'seize. The contradiction worth holding is that the boundary is blurrier in ' +
          'practice than the maxim admits — much of life is partial control. Still, as a ' +
          'daily triage of where to spend effort and worry, nothing in the file gets more ' +
          'use.',
      },
      {
        note: 'The Obstacle Is the Way',
        source: '7 notes · Marcus Aurelius',
        text:
          "From the Meditations: Marcus's private instruction that 'the impediment to " +
          "action advances action; what stands in the way becomes the way.' The core " +
          'insight your notes keep circling is reframing — the obstacle is not an ' +
          'interruption of the work but, on the hard days, the material of it. Across your ' +
          'highlights this reads as the most actionable of the three, less a metaphysics ' +
          'than a move you can make mid-difficulty. The risk you noted is that it curdles ' +
          'into toxic positivity if used to deny that some obstacles are simply losses. ' +
          "Held honestly, it is the bridge between Epictetus's acceptance and Nietzsche's " +
          'appetite: use what you cannot avoid.',
      },
    ],
    questions: [
      { text: 'What are you still spending your peace trying to control?' },
      { text: 'If this exact year returned, unchanged, forever — could you say yes to it?' },
      { text: 'Where is an obstacle quietly asking to be treated as the assignment?' },
    ],
    apply: [
      "Name one thing you've been resenting today, and ask whether it was ever yours to " +
        'control. If not, set it down on purpose.',
      'Take the obstacle in front of you and finish the sentence “The way through this ' +
        'is…” before you do anything else about it.',
      'Tonight, recall one good hour from today in full detail. The amor fati rehearsal works ' +
        'better when you start with what went right.',
    ],
    wildcard: {
      bridge:
        "Amor fati has an unlikely modern home: the cockpit. Apollo's flight controllers " +
        'drilled a phrase close to the Stoic core — “work the problem” — for the ' +
        'moment everything goes wrong. You do not panic and you do not pray; you take the ' +
        'situation exactly as given and act only on the variables you actually hold. ' +
        'Twenty-one centuries after Epictetus, the Stoa turns out to be excellent flight ' +
        'discipline.',
      trivia:
        'Epictetus was lame in one leg — by one account, his master broke it. He is said ' +
        'to have remarked only, “Now you have broken it,” and carried on talking. ' +
        'True or not, the story is the philosophy.',
    },
    forgotten: {
      note: 'Ataraxia — the untroubled mind',
      nudge:
        "Filed two years ago from a note on Epicurus, opened once. The Garden's quieter " +
        'answer to the same problem the Stoa keeps wrestling — worth meeting again.',
    },
  },
}

export const ARCHIVE: ArchiveResponse = {
  groups: [
    {
      label: 'This week',
      items: [
        {
          id: 'fixture-47',
          issue_no: 47,
          date: 'Tue, 30 Jun',
          title: 'Amor Fati',
          dek: 'Epictetus, Marcus Aurelius, and Nietzsche, circling one instruction: want what happens.',
          tags: ['Philosophy', 'Stoicism', 'Meaning'],
          reading_min: 7,
        },
        {
          id: 'fixture-46',
          issue_no: 46,
          date: 'Mon, 29 Jun',
          title: 'The Geometry of Habits',
          dek: 'Loops, attractors, and why real change behaves like a phase transition.',
          tags: ['Behaviour', 'Systems'],
          reading_min: 8,
        },
        {
          id: 'fixture-45',
          issue_no: 45,
          date: 'Sun, 28 Jun',
          title: 'Borrowed Light',
          dek: 'On influence — and what we mistake for our own ideas.',
          tags: ['Creativity', 'History'],
          reading_min: 6,
        },
        {
          id: 'fixture-44',
          issue_no: 44,
          date: 'Sat, 27 Jun',
          title: 'The Patience of Trees',
          dek: 'Slow growth, deep roots, and the notes you keep returning to.',
          tags: ['Nature', 'Time'],
          reading_min: 5,
        },
      ],
    },
    {
      label: 'Earlier in June',
      items: [
        {
          id: 'fixture-43',
          issue_no: 43,
          date: 'Fri, 26 Jun',
          title: 'A Grammar of Mistakes',
          dek: 'Error as information — from typesetting to machine learning.',
          tags: ['Learning', 'Language'],
          reading_min: 9,
        },
        {
          id: 'fixture-42',
          issue_no: 42,
          date: 'Thu, 25 Jun',
          title: 'The Quiet Part',
          dek: 'Silence, rests, and negative space across music and design.',
          tags: ['Art', 'Attention'],
          reading_min: 6,
        },
        {
          id: 'fixture-41',
          issue_no: 41,
          date: 'Wed, 24 Jun',
          title: 'Maps and the Territory',
          dek: 'Models, abstraction, and the cost of forgetting they are models.',
          tags: ['Philosophy', 'Systems'],
          reading_min: 8,
        },
      ],
    },
  ],
  total: 7,
}

const SETTINGS: Settings = {
  vault_paths: ['~/Documents/Athenaeum'],
  excluded_paths: ['./Templates', './Daily notes', '~/Vault/Private'],
  profile_text: '',
  cadence_days: 1,
  delivery_time: '07:00',
  timezone: 'UTC',
  reading_min: 7,
  notes_per_issue: 3,
  provider: 'openrouter',
  ollama_endpoint: '',
  embed_model: 'openai/text-embedding-3-small',
  summary_model: 'openai/gpt-4o-mini',
  writer_model: 'anthropic/claude-3.5-sonnet',
}
const vaultNoteCount = 1284

export const fixtureClient: ApiClient = {
  getTodayIssue: async () => AMOR_FATI,
  getIssue: async () => AMOR_FATI,
  getArchive: async () => ARCHIVE,
  getSettings: async (): Promise<SettingsResponse> => ({ ...SETTINGS, vault_note_count: vaultNoteCount }),
  saveSettings: async (patch: SettingsPatch): Promise<SettingsResponse> => {
    Object.assign(SETTINGS, patch)
    return { ...SETTINGS, vault_note_count: vaultNoteCount }
  },
  getStatus: async () => STATUS,
  reindex: async () => ({ job_id: 'fixture-ingest' }),
  triggerIssue: async () => ({ job_id: 'fixture-generate' }),
  cancelJobs: async () => ({ cancelled: 0 }),
  expandNote: async (title: string) => ({ title,
    text: `**${title}** — a fuller, ~500-word standalone reading of this note would appear here, unfolding its `
      + `core thesis, the reasoning, the key distinctions, and the takeaway.` }),
}
