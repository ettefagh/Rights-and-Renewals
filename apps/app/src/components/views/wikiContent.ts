export type LawSource = {
  label: string;
  url: string;
};

export type LawGuide = {
  id: string;
  jurisdiction: string;
  title: string;
  summary: string;
  takeaways: readonly string[];
  sources: readonly LawSource[];
};

export const WIKI_AS_OF = '10 November 2026';

export const wikiLawGuides: readonly LawGuide[] = [
  {
    id: 'online-cancellation',
    jurisdiction: 'Germany · BGB',
    title: 'Online cancellation button',
    summary:
      'BGB § 312k covers paid continuing consumer contracts that a business lets consumers conclude on its website, subject to statutory exceptions.',
    takeaways: [
      'The covered website must provide an easy-to-find cancellation button and a confirmation step. The consumer should receive an electronic confirmation.',
      'If the required button and confirmation page are not provided, a consumer can generally cancel the covered contract at any time without notice. This is not a universal rule for every contract.'
    ],
    sources: [
      { label: 'BGB § 312k', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }
    ]
  },
  {
    id: 'subscription-renewals',
    jurisdiction: 'Germany · BGB',
    title: 'Renewal terms for recurring services',
    summary:
      'BGB § 309 No. 9 limits certain standard contract terms for regular supplies of goods and services.',
    takeaways: [
      'For covered terms, an initial binding term may not exceed two years. After that, a tacit renewal must be indefinite and cancellable at any time with no more than one month’s notice.',
      'The rule has exceptions, including insurance and certain contracts for goods sold together. Check the contract and the type of service.',
      'For contracts formed before 1 March 2022, transitional rules may affect which version applies. Check EGBGB Article 229 § 60.'
    ],
    sources: [
      { label: 'BGB § 309 No. 9', url: 'https://www.gesetze-im-internet.de/bgb/__309.html' },
      { label: 'EGBGB Article 229 § 60', url: 'https://www.gesetze-im-internet.de/bgbeg/art_229__60.html' }
    ]
  },
  {
    id: 'withdrawal',
    jurisdiction: 'Germany · distance contracts',
    title: 'Withdrawal is different from cancellation',
    summary:
      'A withdrawal right can apply to qualifying distance or off-premises contracts. It is separate from ending an ongoing subscription.',
    takeaways: [
      'A 14-day period generally applies to qualifying contracts, but statutory exceptions apply and the starting point depends on the contract and what was bought.',
      'Do not treat withdrawal as a general right to cancel any subscription at any time.'
    ],
    sources: [
      { label: 'BGB § 312g', url: 'https://www.gesetze-im-internet.de/bgb/__312g.html' },
      { label: 'BGB § 355', url: 'https://www.gesetze-im-internet.de/bgb/__355.html' },
      { label: 'BGB § 356', url: 'https://www.gesetze-im-internet.de/bgb/__356.html' }
    ]
  },
  {
    id: 'statutory-defect-rights',
    jurisdiction: 'Germany · consumer goods',
    title: 'Statutory rights for faulty goods',
    summary:
      'For a consumer purchase from a trader, statutory defect rights are generally asserted against the seller. They are separate from a manufacturer’s commercial guarantee.',
    takeaways: [
      'Repair or replacement is generally the first remedy. Price reduction or ending the contract may be available under statutory conditions.',
      'For ordinary goods, defect claims are generally subject to a two-year limitation period from delivery. Exceptions and special rules apply.',
      'If a defect appears within the first year, it is generally presumed to have existed at delivery unless an exception applies. This affects proof; it does not guarantee an automatic refund.'
    ],
    sources: [
      { label: 'BGB § 437', url: 'https://www.gesetze-im-internet.de/bgb/__437.html' },
      { label: 'BGB § 439', url: 'https://www.gesetze-im-internet.de/bgb/__439.html' },
      { label: 'BGB § 438', url: 'https://www.gesetze-im-internet.de/bgb/__438.html' },
      { label: 'BGB § 477', url: 'https://www.gesetze-im-internet.de/bgb/__477.html' }
    ]
  },
  {
    id: 'commercial-guarantees',
    jurisdiction: 'Germany · BGB',
    title: 'Commercial guarantees',
    summary:
      'A commercial guarantee is a voluntary promise by its named guarantor, with its own coverage and claim procedure.',
    takeaways: [
      'A guarantee adds to statutory seller rights; it does not replace or reduce them.',
      'Check who gave the guarantee, which product it covers, how long it lasts and how to make a claim.'
    ],
    sources: [
      { label: 'BGB § 443', url: 'https://www.gesetze-im-internet.de/bgb/__443.html' },
      { label: 'BGB § 479', url: 'https://www.gesetze-im-internet.de/bgb/__479.html' }
    ]
  },
  {
    id: 'eu-goods',
    jurisdiction: 'European Union · sale of goods',
    title: 'EU rules for goods conformity',
    summary:
      'Directive (EU) 2019/771 sets a shared EU framework for consumer sales of goods. National law implements the rules, so local details can differ.',
    takeaways: [
      'The Directive generally makes the seller liable for a lack of conformity that appears within two years of delivery.',
      'It provides a one-year presumption about when a defect existed, while allowing Member States to provide a longer period. Use the national law that applies to the purchase.'
    ],
    sources: [
      {
        label: 'Directive (EU) 2019/771',
        url: 'https://eur-lex.europa.eu/eli/dir/2019/771/oj/eng'
      }
    ]
  },
  {
    id: 'cross-border',
    jurisdiction: 'European Union · cross-border contracts',
    title: 'Which law applies across borders?',
    summary:
      'Rome I can preserve a consumer’s mandatory home-country protections when a trader directs activity to the country where the consumer habitually lives.',
    takeaways: [
      'This protection depends on the facts and the contract being within the rule’s scope. A chosen-law clause does not automatically settle the question.',
      'Check the country, seller, purchase channel and contract before relying on a national rule.'
    ],
    sources: [
      {
        label: 'Rome I Regulation, Article 6',
        url: 'https://eur-lex.europa.eu/eli/reg/2008/593/oj/eng'
      }
    ]
  }
];

export const wikiGlossary = [
  {
    id: 'defect-rights',
    title: 'Statutory defect rights',
    label: 'Gewährleistung · Germany',
    description:
      'Ordinary consumer-goods defect claims are generally subject to a two-year limitation period from delivery. A defect appearing within the first year is generally presumed to have existed at delivery, subject to exceptions. That presumption concerns proof, not an automatic refund.',
    sources: [
      { label: 'BGB § 438', url: 'https://www.gesetze-im-internet.de/bgb/__438.html' },
      { label: 'BGB § 477', url: 'https://www.gesetze-im-internet.de/bgb/__477.html' }
    ]
  },
  {
    id: 'renewal-cancellation',
    title: 'Renewal and cancellation',
    label: 'BGB §§ 309 and 312k · Germany',
    description:
      'Some recurring-service renewal terms are limited to an indefinite renewal with no more than one month’s notice after the initial term. Covered online contracts may also require a cancellation button. Contract type and statutory exceptions matter.',
    sources: [
      { label: 'BGB § 309 No. 9', url: 'https://www.gesetze-im-internet.de/bgb/__309.html' },
      { label: 'BGB § 312k', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }
    ]
  },
  {
    id: 'receipt-fingerprint',
    title: 'Receipt fingerprint integrity',
    label: 'On-device record · SHA-256',
    description:
      'The app stores a SHA-256 digest with the encrypted receipt and checks the decrypted bytes against it. Comparing a newly computed digest with the stored digest can detect changes to the saved bytes; it does not prove who issued the receipt, when it was created, or that the starting image was truthful.',
    sources: []
  }
] as const;

type QuizOption = {
  id: 'a' | 'b' | 'c' | 'd';
  label: string;
};

export type QuizId = 'subscriptions' | 'warranties';

export type WikiQuiz = {
  id: QuizId;
  title: string;
  description: string;
  questions: readonly {
    id: string;
    prompt: string;
    options: readonly [QuizOption, QuizOption, QuizOption, QuizOption];
    correctOptionId: QuizOption['id'];
    explanation: string;
    source: LawSource;
  }[];
};

export const wikiQuizzes = [
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    description: 'Practice the difference between ending a contract and withdrawing from it.',
        questions: [
      {
        id: 'termination-or-withdrawal',
        prompt: 'You want to stop an ongoing streaming plan. What is cancellation (Kündigung)?',
        options: [
          { id: 'a', label: 'Ending an ongoing contract for the future' },
          { id: 'b', label: 'Undoing any purchase within 14 days, without exceptions' },
          { id: 'c', label: 'Asking the bank to reverse every payment' },
          { id: 'd', label: 'Deleting the app from your phone' }
        ],
        correctOptionId: 'a',
        explanation:
          'Cancellation ends an ongoing contract. Withdrawal can apply to a qualifying new distance contract, but it has separate conditions and exceptions.',
        source: { label: 'BGB §§ 312g and 355', url: 'https://www.gesetze-im-internet.de/bgb/__355.html' }
      },
      {
        id: 'missing-online-button',
        prompt: 'A paid continuing contract was offered and concluded on a trader’s website. If the required cancellation flow is missing, what may § 312k allow?',
        options: [
          { id: 'a', label: 'A full refund of every past payment' },
          { id: 'b', label: 'Cancellation of the covered contract at any time without notice' },
          { id: 'c', label: 'Cancellation only at the end of the original term' },
          { id: 'd', label: 'No change; online cancellation rules never apply' }
        ],
        correctOptionId: 'b',
        explanation:
          'For contracts within § 312k and outside its exceptions, missing required buttons and confirmation page can let a consumer cancel without a notice period.',
        source: { label: 'BGB § 312k', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }
      },
      {
        id: 'renewal-notice',
        prompt: 'For a covered recurring service, what can a standard renewal clause generally provide after the initial term?',
        options: [
          { id: 'a', label: 'An indefinite renewal cancellable at any time with no more than one month’s notice' },
          { id: 'b', label: 'A new two-year fixed term in every case' },
          { id: 'c', label: 'A three-month cancellation period in every case' },
          { id: 'd', label: 'No cancellation rights at all' }
        ],
        correctOptionId: 'a',
        explanation:
          'BGB § 309 No. 9 limits certain standard terms for recurring supplies of goods and services. Exceptions and the contract type matter.',
        source: { label: 'BGB § 309 No. 9', url: 'https://www.gesetze-im-internet.de/bgb/__309.html' }
      },
      {
        id: 'trial-details',
        prompt: 'Before starting a free trial, which details are useful to record?',
        options: [
          { id: 'a', label: 'Trial end date, paid price, renewal timing and how to cancel' },
          { id: 'b', label: 'Only the app icon colour' },
          { id: 'c', label: 'The company’s office opening hours' },
          { id: 'd', label: 'Nothing; every trial ends automatically' }
        ],
        correctOptionId: 'a',
        explanation:
          'Save the trial end date, price after trial, renewal timing and cancellation route. A covered online contract may also have a § 312k cancellation button; contract terms still matter.',
        source: { label: 'BGB § 312k', url: 'https://www.gesetze-im-internet.de/bgb/__312k.html' }
      }
    ]
  },
  {
    id: 'warranties',
    title: 'Warranties & faulty goods',
    description: 'Learn who to contact and what a time limit or guarantee actually means.',
    questions: [
      {
        id: 'first-year-presumption',
        prompt: 'A defect appears in a product within one year of delivery. What does the German presumption generally do?',
        options: [
          { id: 'a', label: 'Guarantee an immediate refund' },
          { id: 'b', label: 'Presume the defect existed at delivery, subject to exceptions' },
          { id: 'c', label: 'Prove that the manufacturer caused the defect' },
          { id: 'd', label: 'Extend every commercial guarantee to two years' }
        ],
        correctOptionId: 'b',
        explanation:
          'The presumption concerns when the defect existed. It does not decide the remedy or guarantee a refund.',
        source: { label: 'BGB § 477', url: 'https://www.gesetze-im-internet.de/bgb/__477.html' }
      },
      {
        id: 'seller-or-manufacturer',
        prompt: 'For statutory defect rights on a consumer purchase from a trader, who is normally responsible?',
        options: [
          { id: 'a', label: 'The seller under the purchase contract' },
          { id: 'b', label: 'Only the manufacturer' },
          { id: 'c', label: 'The delivery company in every case' },
          { id: 'd', label: 'The payment provider' }
        ],
        correctOptionId: 'a',
        explanation:
          'Statutory defect rights are generally asserted against the seller. A separate commercial guarantee may name a different guarantor.',
        source: { label: 'BGB § 437', url: 'https://www.gesetze-im-internet.de/bgb/__437.html' }
      },
      {
        id: 'commercial-guarantee',
        prompt: 'A manufacturer’s voluntary commercial guarantee has expired. What does that tell you about statutory rights against the seller?',
        options: [
          { id: 'a', label: 'They always expire at the same time' },
          { id: 'b', label: 'They may still exist under separate statutory rules' },
          { id: 'c', label: 'The seller must provide a new manufacturer guarantee' },
          { id: 'd', label: 'The purchase is automatically refunded' }
        ],
        correctOptionId: 'b',
        explanation:
          'A commercial guarantee is separate from statutory seller rights. Check the purchase date, defect, seller and applicable limitation rules.',
        source: { label: 'BGB §§ 443 and 479', url: 'https://www.gesetze-im-internet.de/bgb/__443.html' }
      },
      {
        id: 'purchase-records',
        prompt: 'Which records are useful to keep after buying a product?',
        options: [
          { id: 'a', label: 'Receipt or order confirmation, plus product and guarantee details' },
          { id: 'b', label: 'Only the delivery box' },
          { id: 'c', label: 'Only a screenshot of the shop homepage' },
          { id: 'd', label: 'No records; the seller always has everything' }
        ],
        correctOptionId: 'a',
        explanation:
          'Keep proof of purchase and the product or guarantee terms so you can identify the seller, item and any separate guarantor when you make a claim.',
        source: { label: 'BGB § 479', url: 'https://www.gesetze-im-internet.de/bgb/__479.html' }
      }
    ]
  }
] as const satisfies readonly WikiQuiz[];
