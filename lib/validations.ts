import { z } from 'zod';

// ---------------------------------------------------------------------------
// Exam create / update
// ---------------------------------------------------------------------------
export const examSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  title_km: z.string().max(300).optional().or(z.literal('')),
  category_id: z.string().uuid().optional().or(z.literal('')),
  description: z.string().max(5000).optional().or(z.literal('')),
  instructions: z.string().max(5000).optional().or(z.literal('')),
  language_mode: z.enum(['km', 'en', 'bilingual']).default('bilingual'),
  subject: z.string().max(200).optional().or(z.literal('')),
  difficulty: z.string().max(100).optional().or(z.literal('')),
  access_code: z.string().min(3, 'Access code is required').max(60),
  duration_minutes: z.coerce.number().int().positive('Duration must be greater than 0'),
  open_at: z.string().optional().or(z.literal('')),
  close_at: z.string().optional().or(z.literal('')),
  is_published: z.boolean().default(false),
  show_results: z.boolean().default(false),
  shuffle_questions: z.boolean().default(true),
  shuffle_choices: z.boolean().default(true),
  max_tab_switches: z.coerce.number().int().min(0).default(1),
});
export type ExamFormValues = z.infer<typeof examSchema>;

// ---------------------------------------------------------------------------
// Category create
// ---------------------------------------------------------------------------
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  name_km: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Question + choices editor
// ---------------------------------------------------------------------------
export const choiceSchema = z
  .object({
    id: z.string().optional(),
    content_markdown: z.string().default(''),
    image_url: z.string().url('Choice image must be a valid URL').optional().or(z.literal('')),
    is_correct: z.boolean().default(false),
  })
  .refine(
    (c) => (c.content_markdown && c.content_markdown.trim() !== '') || (c.image_url && c.image_url !== ''),
    { message: 'Each choice needs text or an image' }
  );

export const questionSchema = z.object({
  id: z.string().optional(),
  prompt_markdown: z.string().min(1, 'Question prompt is required'),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  points: z.coerce.number().int().positive('Points must be greater than 0').default(1),
  order_index: z.coerce.number().int().default(0),
  choices: z
    .array(choiceSchema)
    .min(2, 'Add at least 2 answer choices')
    .refine((choices) => choices.some((c) => c.is_correct), {
      message: 'Mark at least one choice as correct',
    }),
});
export type QuestionFormValues = z.infer<typeof questionSchema>;

// ---------------------------------------------------------------------------
// Organization create / onboarding
// ---------------------------------------------------------------------------
export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required').max(200),
});
export type OrganizationFormValues = z.infer<typeof organizationSchema>;

// ---------------------------------------------------------------------------
// Join exam (student enters access code)
// ---------------------------------------------------------------------------
export const joinSchema = z.object({
  access_code: z.string().min(1, 'Please enter an access code'),
});
export type JoinFormValues = z.infer<typeof joinSchema>;

// ---------------------------------------------------------------------------
// Start attempt (student info form)
// ---------------------------------------------------------------------------
export const startAttemptSchema = z.object({
  access_code: z.string().min(1),
  student_name: z.string().min(1, 'Full name is required').max(200),
  student_id: z.string().min(1, 'Student ID is required').max(100),
  school_name: z.string().max(300).optional().or(z.literal('')),
  grade: z.string().max(100).optional().or(z.literal('')),
});
export type StartAttemptValues = z.infer<typeof startAttemptSchema>;

// ---------------------------------------------------------------------------
// Submit responses
// ---------------------------------------------------------------------------
export const submitAttemptSchema = z.object({
  attempt_id: z.string().uuid(),
  // map of questionId -> choiceId (only answered questions are included)
  answers: z.record(z.string().uuid(), z.string().uuid()),
  auto: z.boolean().optional().default(false),
});
export type SubmitAttemptValues = z.infer<typeof submitAttemptSchema>;

// ---------------------------------------------------------------------------
// Security events
// ---------------------------------------------------------------------------
export const securityEventSchema = z.object({
  attempt_id: z.string().uuid(),
  event_type: z.enum([
    'tab_hidden',
    'tab_visible',
    'window_blur',
    'window_focus',
  ]),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type SecurityEventValues = z.infer<typeof securityEventSchema>;
