// Simple i18n dictionary for the SOMA Competition Portal.
// Two languages: English ('en') and Khmer ('km').

export type Lang = 'en' | 'km';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'km', label: 'ខ្មែរ' },
];

type Dict = Record<string, { en: string; km: string }>;

export const dictionary: Dict = {
  // Brand / general
  appName: { en: 'SOMA Portal', km: 'តេស្ត SOMA' },
  tagline: {
    en: 'Online competition exams for SOMA Education Group',
    km: 'ការប្រឡងប្រកួតប្រជែងតាមអ៊ីនធឺណិតសម្រាប់ SOMA Education Group',
  },
  joinExam: { en: 'Join Exam', km: 'ចូលប្រឡង' },
  adminLogin: { en: 'Admin Login', km: 'ចូលជាអ្នកគ្រប់គ្រង' },
  back: { en: 'Back', km: 'ត្រឡប់ក្រោយ' },
  loading: { en: 'Loading…', km: 'កំពុងផ្ទុក…' },
  submit: { en: 'Submit', km: 'ដាក់ស្នើ' },
  cancel: { en: 'Cancel', km: 'បោះបង់' },
  save: { en: 'Save', km: 'រក្សាទុក' },

  // Landing
  landingDescription: {
    en: 'A clean, fair, and modern platform for math, physics, and academic competitions. Enter your access code to begin.',
    km: 'វេទិកាដ៏ស្អាត យុត្តិធម៌ និងទំនើបសម្រាប់ការប្រកួតគណិតវិទ្យា រូបវិទ្យា និងវិញ្ញាសាសិក្សា។ សូមបញ្ចូលលេខកូដចូលរបស់អ្នកដើម្បីចាប់ផ្តើម។',
  },

  // Join
  enterAccessCode: { en: 'Enter access code', km: 'បញ្ចូលលេខកូដចូល' },
  accessCode: { en: 'Access code', km: 'លេខកូដចូល' },
  continueBtn: { en: 'Continue', km: 'បន្ត' },
  invalidAccessCode: {
    en: 'Invalid access code, or the exam is not available.',
    km: 'លេខកូដចូលមិនត្រឹមត្រូវ ឬការប្រឡងមិនមាន។',
  },

  // Student info
  studentInformation: { en: 'Student Information', km: 'ព័ត៌មានសិស្ស' },
  fullName: { en: 'Full name', km: 'ឈ្មោះពេញ' },
  studentId: { en: 'Student ID', km: 'លេខសម្គាល់សិស្ស' },
  schoolName: { en: 'School name', km: 'ឈ្មោះសាលា' },
  gradeClass: { en: 'Grade / Class', km: 'ថ្នាក់' },
  instructions: { en: 'Instructions', km: 'សេចក្តីណែនាំ' },
  startExam: { en: 'Start Exam', km: 'ចាប់ផ្តើមប្រឡង' },
  duration: { en: 'Duration', km: 'រយៈពេល' },
  minutes: { en: 'minutes', km: 'នាទី' },
  questions: { en: 'questions', km: 'សំណួរ' },

  // Exam taking
  timeRemaining: { en: 'Time remaining', km: 'ពេលវេលានៅសល់' },
  question: { en: 'Question', km: 'សំណួរ' },
  of: { en: 'of', km: 'នៃ' },
  answered: { en: 'answered', km: 'បានឆ្លើយ' },
  submitExam: { en: 'Submit Exam', km: 'ដាក់ស្នើការប្រឡង' },
  confirmSubmit: {
    en: 'Are you sure you want to submit? You cannot change your answers after this.',
    km: 'តើអ្នកប្រាកដទេថាចង់ដាក់ស្នើ? អ្នកមិនអាចផ្លាស់ប្តូរចម្លើយរបស់អ្នកក្រោយពេលនេះទេ។',
  },
  timeAlmostUp: { en: 'Time is almost up!', km: 'ពេលវេលាជិតអស់ហើយ!' },

  // Tab switch warnings
  tabSwitchWarning: {
    en: 'Warning: leaving the exam tab is recorded. Repeated switching may flag or auto-submit your exam.',
    km: 'ការព្រមាន៖ ការចេញពីផ្ទាំងប្រឡងត្រូវបានកត់ត្រា។ ការប្តូរម្តងហើយម្តងទៀតអាចធ្វើឱ្យការប្រឡងរបស់អ្នកត្រូវបានដាក់សញ្ញា ឬដាក់ស្នើដោយស្វ័យប្រវត្តិ។',
  },
  examAutoSubmitted: {
    en: 'Your exam was auto-submitted.',
    km: 'ការប្រឡងរបស់អ្នកត្រូវបានដាក់ស្នើដោយស្វ័យប្រវត្តិ។',
  },

  // Result
  examSubmitted: { en: 'Exam Submitted', km: 'ការប្រឡងបានដាក់ស្នើ' },
  thankYou: {
    en: 'Thank you. Your responses have been recorded.',
    km: 'សូមអរគុណ។ ចម្លើយរបស់អ្នកត្រូវបានកត់ត្រា។',
  },
  yourScore: { en: 'Your score', km: 'ពិន្ទុរបស់អ្នក' },
  points: { en: 'points', km: 'ពិន្ទុ' },
  resultsHidden: {
    en: 'Results are not shown for this exam. Your teacher has your score.',
    km: 'លទ្ធផលមិនត្រូវបានបង្ហាញសម្រាប់ការប្រឡងនេះទេ។ គ្រូរបស់អ្នកមានពិន្ទុរបស់អ្នក។',
  },

  // Errors
  errorGeneric: { en: 'Something went wrong. Please try again.', km: 'មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។' },
  examNotPublished: { en: 'This exam is not available yet.', km: 'ការប្រឡងនេះមិនទាន់មាននៅឡើយទេ។' },
  examNotOpen: { en: 'This exam is not open yet.', km: 'ការប្រឡងនេះមិនទាន់បើកនៅឡើយទេ។' },
  examClosed: { en: 'This exam is now closed.', km: 'ការប្រឡងនេះត្រូវបានបិទហើយ។' },
  alreadySubmitted: { en: 'This attempt has already been submitted.', km: 'ការប៉ុនប៉ងនេះត្រូវបានដាក់ស្នើរួចហើយ។' },
};

export function t(key: keyof typeof dictionary, lang: Lang): string {
  const entry = dictionary[key];
  if (!entry) return key as string;
  return entry[lang] ?? entry.en;
}
