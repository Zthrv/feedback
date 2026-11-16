import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import { TriangleAlert } from "lucide-react";

import { createMatcher } from "@/utils/wordMatcher";
import { SUBMITTED_EVENT } from "@/components/layout/SentSummary";

import FeedbackService from "@/services/feedbackService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
} from "@/components/ui/combobox";

const MAX_TITLE = 100;
const MAX_TEXT = 500;

function LanguageWarning({ word }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-600">
      <TriangleAlert size={14} className="shrink-0" />
      <span>
        &ldquo;{word}&rdquo; looks like inappropriate language. Please rephrase it.
      </span>
    </p>
  );
}

function FeedbackForm() {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  const [title = "", text = ""] = useWatch({ control, name: ["title", "text"] });

  const titleLength = title.length;
  const textLength = text.length;

  const [recipients, setRecipients] = useState([]);
  const [recipientsError, setRecipientsError] = useState("");

  const recipientItems = useMemo(
    () =>
      recipients.map((recipient) => ({
        value: recipient.user_id,
        label: recipient.designation
          ? `${recipient.full_name} (${recipient.designation})`
          : recipient.full_name,
      })),
    [recipients]
  );
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    FeedbackService.getRecipients()
      .then(setRecipients)
      .catch((error) => {
        console.error(error);
        setRecipientsError("Unable to load employees.");
      });
  }, []);

  // Checks the words as they are typed. If the lists fail to load there is simply
  // no live warning, and the server still checks on submit.
  const [matcher, setMatcher] = useState(null);

  useEffect(() => {
    FeedbackService.getBlockedWords()
      .then((lists) => setMatcher(createMatcher(lists)))
      .catch((error) => console.error(error));
  }, []);

  // While typing, the word still being written is left alone, so "ass" does not flash
  // on the way to "assign". Once a submit has been refused, the whole text is checked.
  // Used for both the title and the feedback text
  const flagged = (value, error) => {
    if (!matcher) return null;

    const finishedWords = value.replace(/[a-z0-9@$!*#_]+$/i, "");
    return matcher.find(finishedWords) || (error?.type === "validate" ? matcher.find(value) : null);
  };

  const flaggedInTitle = flagged(title, errors.title);
  const flaggedInText = flagged(text, errors.text);

  // Blocks submit while the title or text contains a blocked word
  const cleanLanguage = (value) => !matcher || !matcher.find(value);

  const onSubmit = async (data) => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      await FeedbackService.createFeedback(data.receiverId, data.title, data.text);

      toast.success("Feedback submitted", { duration: 3000 });
      window.dispatchEvent(new Event(SUBMITTED_EVENT));
      reset();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          "Unable to submit feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-5xl mx-auto rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">
          Create Anonymous Feedback
        </CardTitle>

        {/* Information Box */}
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              i
            </div>

            <p className="text-sm text-brand-700">
              <span className="font-semibold">
                Your identity will remain anonymous.
              </span>{" "}
              Please provide honest, respectful and constructive feedback.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Recipient */}
            <div className="space-y-3">
              <Label htmlFor="receiverId">
                Recipient <span className="text-red-500">*</span>
              </Label>

              <Controller
                name="receiverId"
                control={control}
                rules={{ required: "Please select an employee" }}
                render={({ field }) => (
                  <Combobox
                    items={recipientItems}
                    value={
                      recipientItems.find((item) => item.value === field.value) ?? null
                    }
                    onValueChange={(item) => field.onChange(item ? item.value : "")}
                  >
                    <ComboboxInputGroup>
                      <ComboboxInput
                        id="receiverId"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        placeholder="Search employees..."
                        className="h-11 rounded-md border-slate-300 focus-visible:border-brand-500 focus-visible:ring-brand-500/50"
                      />

                      <ComboboxClear />
                      <ComboboxTrigger />
                    </ComboboxInputGroup>

                    <ComboboxPortal>
                      <ComboboxPositioner>
                        <ComboboxPopup>
                          <ComboboxEmpty>
                            {recipientsError
                              ? recipientsError
                              : recipients.length === 0
                              ? "Loading employees…"
                              : "No employees found."}
                          </ComboboxEmpty>

                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.value} value={item}>
                                {item.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxPopup>
                      </ComboboxPositioner>
                    </ComboboxPortal>
                  </Combobox>
                )}
              />

              {(errors.receiverId || recipientsError) && (
                <p className="text-sm text-red-500">
                  {errors.receiverId?.message || recipientsError}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>

                <span className={`text-xs ${titleLength > MAX_TITLE ? "text-red-500" : "text-slate-400"}`}>
                  {titleLength}/{MAX_TITLE}
                </span>
              </div>

              <Input
                id="title"
                className="h-11"
                placeholder="Example: Excellent teamwork during the project"
                {...register("title", {
                  required: "Title is required",
                  maxLength: {
                    value: MAX_TITLE,
                    message: `Title must be ${MAX_TITLE} characters or fewer`,
                  },
                  validate: cleanLanguage,
                })}
              />

              {flaggedInTitle ? (
                <LanguageWarning word={flaggedInTitle} />
              ) : (
                errors.title?.message && <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

          </div>

          {/* Feedback */}
          <div className="space-y-3">

            <div className="flex items-center justify-between">
              <Label htmlFor="text">
                Feedback <span className="text-red-500">*</span>
              </Label>

              <span className={`text-xs ${textLength > MAX_TEXT ? "text-red-500" : "text-slate-400"}`}>
                {textLength}/{MAX_TEXT}
              </span>
            </div>

            <Textarea
              id="text"
              rows={7}
              className="min-h-[170px] resize-y"
              placeholder="Write your feedback here..."
              {...register("text", {
                required: "Feedback is required",
                minLength: {
                  value: 10,
                  message: "Feedback must be at least 10 characters",
                },
                maxLength: {
                  value: MAX_TEXT,
                  message: `Feedback must be ${MAX_TEXT} characters or fewer`,
                },
                validate: cleanLanguage,
              })}
            />

            {flaggedInText ? (
              <LanguageWarning word={flaggedInText} />
            ) : (
              errors.text?.message && <p className="text-sm text-red-500">{errors.text.message}</p>
            )}

            <p className="text-xs text-slate-500">
              Share specific examples that will help the recipient improve or
              continue doing well. The attributes your feedback covers, and
              whether each is positive or negative, are detected automatically.
            </p>

          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 pb-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}

export default FeedbackForm;
