import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import FeedbackService from "@/services/feedbackService";

// Fired by the feedback form right after a successful submit
const SUBMITTED_EVENT = "feedback:submitted";

// Stays under the server's limit of 20 requests per endpoint per minute
const CHECK_AGAIN_AFTER = 4000;

const lastLabels = {
  sent: { text: "Sent", className: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
  bounced: { text: "Bounced", className: "text-red-600", dot: "bg-red-500" },
  checking: { text: "Checking…", className: "text-slate-500", dot: "bg-slate-400 animate-pulse" },
};

/**
 * What the logged-in person has sent: how many were delivered, how many bounced,
 * and how the latest one went. Nothing else about sent feedback is kept.
 */
function SentSummary() {

  const [summary, setSummary] = useState(null);

  const wasChecking = useRef(false);

  useEffect(() => {

    let ignore = false;

    const load = async () => {

      try {

        const data = await FeedbackService.getSentSummary();

        if (!ignore) {
          setSummary(data);
        }

      } catch (error) {

        console.error(error);

      }

    };

    load();

    window.addEventListener(SUBMITTED_EVENT, load);

    return () => {
      ignore = true;
      window.removeEventListener(SUBMITTED_EVENT, load);
    };

  }, []);

  // While the latest feedback is still being checked, look again every moment or two,
  // and tell the sender if it turns out to have bounced
  useEffect(() => {

    if (!summary) {
      return undefined;
    }

    if (summary.last !== "checking") {

      if (wasChecking.current && summary.last === "bounced") {
        toast.error("Your last feedback was not delivered: it was found to be inappropriate.", { duration: 6000 });
      }

      wasChecking.current = false;

      return undefined;

    }

    wasChecking.current = true;

    let ignore = false;

    const timer = setTimeout(async () => {

      try {

        const data = await FeedbackService.getSentSummary();

        if (!ignore) {
          setSummary(data);
        }

      } catch (error) {

        console.error(error);

      }

    }, CHECK_AGAIN_AFTER);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };

  }, [summary]);

  if (!summary) {
    return null;
  }

  const last = lastLabels[summary.last];

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Feedback you sent</SidebarGroupLabel>

      <SidebarGroupContent>
        <div
          data-slot="sent-summary"
          className="mx-2 rounded-lg border border-slate-200 bg-card p-3"
        >
          <div className="grid grid-cols-2 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900">{summary.sent}</p>
              <p className="text-xs text-slate-500">Sent</p>
            </div>

            <div>
              <p className="text-xl font-bold text-red-600">{summary.bounced}</p>
              <p className="text-xs text-slate-500">Bounced</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">Last feedback</span>

            {last ? (
              <span className={`flex items-center gap-1.5 font-semibold ${last.className}`}>
                <span className={`size-2 rounded-full ${last.dot}`} />
                {last.text}
              </span>
            ) : (
              <span className="text-slate-400">None yet</span>
            )}
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );

}

export { SUBMITTED_EVENT };

export default SentSummary;
