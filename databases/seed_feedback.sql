/* ===========================================================
   SAMPLE FEEDBACK — run after schema.sql, on an empty feedback table.
   Each feedback row has one or more rows in feedback_attributes.
   =========================================================== */

USE feedback_system;

/* ===========================================================
   LEADERSHIP (Attribute ID = 1)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(1,2,
'Excellent Team Coordination',
'You consistently coordinate the team effectively and ensure everyone understands their responsibilities.'),

(2,2,
'Strong Decision Making',
'You remained calm during a difficult situation and made timely decisions.'),

(3,3,
'Motivates Others',
'You encourage teammates to perform at their best and maintain a positive work environment.'),

(4,4,
'Ownership of Projects',
'You take responsibility for project outcomes and support the team throughout execution.'),

(5,5,
'Supportive Leadership',
'You are approachable and always willing to guide junior colleagues.'),

(6,6,
'Clear Vision',
'You clearly communicate goals and keep everyone aligned with project objectives.'),

(7,7,
'Conflict Resolution',
'You handled disagreements professionally and helped the team reach a solution.'),

(8,8,
'Leading by Example',
'You consistently demonstrate professionalism and commitment through your actions.'),

(9,9,
'Delegate More Often',
'You sometimes try to complete every important task yourself instead of delegating work.'),

(10,10,
'Improve Team Involvement',
'Team members should be involved more frequently while making important decisions.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(1,1,'Positive'),
(2,1,'Positive'),
(3,1,'Positive'),
(4,1,'Positive'),
(5,1,'Positive'),
(6,1,'Positive'),
(7,1,'Positive'),
(8,1,'Positive'),
(9,1,'Negative'),
(10,1,'Negative');

/* ===========================================================
   PRODUCTIVITY (Attribute ID = 2)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(11,2,
'Delivers Work Quickly',
'You consistently complete assigned work before deadlines.'),

(12,3,
'Highly Efficient',
'You manage your workload efficiently.'),

(13,4,
'Excellent Output',
'You consistently maintain a high work output.'),

(14,5,
'Focused Worker',
'You remain focused throughout the day.'),

(15,6,
'Reliable Performance',
'Your productivity remains consistent.'),

(16,7,
'Great Time Utilization',
'You make excellent use of working hours.'),

(17,8,
'Missed Deadline',
'One task was delayed unnecessarily.'),

(18,9,
'Needs Better Planning',
'Better planning would improve productivity.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(11,2,'Positive'),
(12,2,'Positive'),
(13,2,'Positive'),
(14,2,'Positive'),
(15,2,'Positive'),
(16,2,'Positive'),
(17,2,'Negative'),
(18,2,'Negative');

/* ===========================================================
   WORK QUALITY (Attribute ID = 3)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(19,2,
'Accurate Work',
'Your work is consistently accurate.'),

(20,3,
'Attention to Detail',
'You pay close attention to details.'),

(21,4,
'High Standards',
'You maintain high quality standards.'),

(22,5,
'Reliable Quality',
'Your deliverables are reliable.'),

(23,6,
'Minor Errors',
'Some work contained avoidable mistakes.'),

(24,7,
'Needs Review',
'Double-check your work before submission.'),

(25,8,
'Quality Issue',
'Some outputs required rework.'),

(26,9,
'Incomplete Task',
'One task lacked sufficient detail.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(19,3,'Positive'),
(20,3,'Positive'),
(21,3,'Positive'),
(22,3,'Positive'),
(23,3,'Negative'),
(24,3,'Negative'),
(25,3,'Negative'),
(26,3,'Negative');

/* ===========================================================
   TEAMWORK (Attribute ID = 4)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(27,2,
'Helpful',
'You willingly help teammates.'),

(28,3,
'Supportive',
'You support your colleagues.'),

(29,4,
'Cooperative',
'You cooperate well with others.'),

(30,5,
'Communication Gap',
'Improve collaboration within the team.'),

(31,6,
'Less Participation',
'Participate more during discussions.'),

(32,7,
'Team Coordination',
'Coordinate better with teammates.'),

(33,8,
'Shared Responsibility',
'Take more ownership in group tasks.'),

(34,9,
'Collaboration',
'Work more closely with the team.'),

(35,10,
'Support Needed',
'Offer more support to colleagues.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(27,4,'Positive'),
(28,4,'Positive'),
(29,4,'Positive'),
(30,4,'Negative'),
(31,4,'Negative'),
(32,4,'Negative'),
(33,4,'Negative'),
(34,4,'Negative'),
(35,4,'Negative');

/* ===========================================================
   RELIABILITY (Attribute ID = 5)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(36,2,
'Dependable',
'You are dependable.'),

(37,3,
'Consistent',
'You are consistent in your work.'),

(38,4,
'Missed Commitment',
'One commitment was missed.'),

(39,5,
'Follow-up Needed',
'More follow-up is required.'),

(40,6,
'Delayed Work',
'Some work was delayed.'),

(41,7,
'Inconsistent',
'Performance has been inconsistent.'),

(42,8,
'Availability',
'Availability could improve.'),

(43,9,
'Ownership',
'Take greater ownership of tasks.'),

(44,10,
'Responsibility',
'Responsibilities were not completed on time.'),

(45,10,
'Reliability Concern',
'Colleagues expect more consistency.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(36,5,'Positive'),
(37,5,'Positive'),
(38,5,'Negative'),
(39,5,'Negative'),
(40,5,'Negative'),
(41,5,'Negative'),
(42,5,'Negative'),
(43,5,'Negative'),
(44,5,'Negative'),
(45,5,'Negative');

/* ===========================================================
   COMMUNICATION (Attribute ID = 6)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(46,2,
'Clear Communication',
'You explain things clearly.'),

(47,3,
'Active Listener',
'You listen carefully.'),

(48,4,
'Professional',
'Communication is professional.'),

(49,5,
'Helpful Discussions',
'You contribute effectively.'),

(50,6,
'Transparent',
'You keep everyone informed.'),

(51,7,
'Respectful',
'Communication is respectful.'),

(52,8,
'Collaborative',
'You communicate well with the team.'),

(53,9,
'Needs More Updates',
'Provide updates more frequently.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(46,6,'Positive'),
(47,6,'Positive'),
(48,6,'Positive'),
(49,6,'Positive'),
(50,6,'Positive'),
(51,6,'Positive'),
(52,6,'Positive'),
(53,6,'Negative');

/* ===========================================================
   INNOVATION (Attribute ID = 7)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(54,2,
'Creative',
'You suggest creative ideas.'),

(55,3,
'Problem Solver',
'You solve problems effectively.'),

(56,4,
'Innovative Thinking',
'Fresh ideas are appreciated.'),

(57,5,
'Continuous Improvement',
'You seek improvements.'),

(58,6,
'Idea Sharing',
'You actively share ideas.'),

(59,7,
'Needs More Creativity',
'Think beyond conventional approaches.'),

(60,8,
'More Initiative',
'Take more initiative in innovation.'),

(61,9,
'Experiment More',
'Explore new solutions.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(54,7,'Positive'),
(55,7,'Positive'),
(56,7,'Positive'),
(57,7,'Positive'),
(58,7,'Positive'),
(59,7,'Negative'),
(60,7,'Negative'),
(61,7,'Negative');

/* ===========================================================
   ADAPTABILITY (Attribute ID = 8)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(62,2,
'Flexible',
'You adapt quickly.'),

(63,3,
'Handles Change',
'You handle change well.'),

(64,4,
'Needs Adjustment',
'Adjust faster to new situations.'),

(65,5,
'Learning Curve',
'Learning new tools took longer.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(62,8,'Positive'),
(63,8,'Positive'),
(64,8,'Negative'),
(65,8,'Negative');

/* ===========================================================
   ACCOUNTABILITY (Attribute ID = 9)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(66,2,
'Responsible',
'You take responsibility.'),

(67,3,
'Ownership',
'You own your work.'),

(68,4,
'Reliable',
'You accept accountability.'),

(69,5,
'Missed Ownership',
'Own outcomes more consistently.'),

(70,6,
'Follow Through',
'Improve follow-through.'),

(71,7,
'Responsibility',
'Take more responsibility.'),

(72,8,
'Decision Making',
'Be more accountable for decisions.'),

(73,9,
'Commitment',
'Honor commitments consistently.'),

(74,10,
'Ownership Needed',
'Greater ownership is expected.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(66,9,'Positive'),
(67,9,'Positive'),
(68,9,'Positive'),
(69,9,'Negative'),
(70,9,'Negative'),
(71,9,'Negative'),
(72,9,'Negative'),
(73,9,'Negative'),
(74,9,'Negative');

/* ===========================================================
   TIME MANAGEMENT (Attribute ID = 10)
   =========================================================== */

INSERT INTO feedback
(feedback_id, receiver_id, feedback_title, feedback_text)
VALUES

(75,2,
'Punctual',
'You meet deadlines.'),

(76,3,
'Late Submission',
'One task was submitted late.'),

(77,4,
'Prioritization',
'Prioritize work better.'),

(78,5,
'Deadline Missed',
'A deadline was missed.'),

(79,6,
'Planning',
'Planning can improve.'),

(80,7,
'Time Allocation',
'Allocate time more effectively.'),

(81,8,
'Schedule',
'Maintain a better schedule.'),

(82,9,
'Task Delay',
'Avoid delaying tasks.'),

(83,10,
'Productivity',
'Improve daily planning.');

INSERT INTO feedback_attributes
(feedback_id, attribute_id, feedback_type)
VALUES
(75,10,'Positive'),
(76,10,'Negative'),
(77,10,'Negative'),
(78,10,'Negative'),
(79,10,'Negative'),
(80,10,'Negative'),
(81,10,'Negative'),
(82,10,'Negative'),
(83,10,'Negative');

/* The sample rows above already have their attribute tags */
UPDATE feedback SET classification_status = 'done';
