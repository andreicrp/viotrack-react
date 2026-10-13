-- Add missing violation categories and repair blank category details from the app catalog.
-- Safe to rerun: existing nonblank values are preserved and titles are matched case-insensitively.
-- The app catalog includes Minor, Serious, and Major values, so allow all current catalog types.
ALTER TABLE violations MODIFY COLUMN `type` VARCHAR(30) NOT NULL DEFAULT 'Minor';

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS viotrack_violation_catalog;
CREATE TEMPORARY TABLE viotrack_violation_catalog (
  title VARCHAR(150) NOT NULL,
  description TEXT,
  `type` VARCHAR(30),
  default_sanction VARCHAR(255)
);

INSERT INTO viotrack_violation_catalog (title, description, `type`, default_sanction) VALUES
('Uniform not worn or worn improperly', 'Student did not follow the proper uniform guidelines.', 'Minor', '1st Offense: Written Reprimand'),
('School ID not worn properly', 'Student failed to wear or display their ID as required.', 'Minor', '1st Offense: Written Reprimand'),
('Playing non-educational games', 'Student used devices to play games unrelated to schoolwork.', 'Minor', '1st Offense: Written Reprimand'),
('Sleeping during class or activities', 'Student was caught sleeping during lessons or activities.', 'Minor', '1st Offense: Written Reprimand'),
('Borrowing or lending money', 'Student engaged in borrowing or lending money on campus.', 'Minor', '1st Offense: Written Reprimand'),
('Loitering or shouting in hallways', 'Student caused disturbance by roaming or shouting in hallways.', 'Minor', '1st Offense: Written Reprimand'),
('Leaving classroom messy', 'Student did not clean up their area or left trash behind.', 'Minor', '1st Offense: Written Reprimand'),
('Use of mobile gadgets without permission', 'Student used a mobile device without teacher authorization.', 'Minor', '1st Offense: Written Reprimand'),
('Excessive jewelry or inappropriate appearance', 'Student wore accessories not allowed by the dress code.', 'Minor', '1st Offense: Written Reprimand'),
('Wearing inappropriate clothing', 'Student wore attire that is not allowed in school.', 'Minor', '1st Offense: Written Reprimand'),
('Using vulgar language', 'Student used inappropriate or offensive language.', 'Minor', '1st Offense: Written Reprimand'),
('Minor bullying or teasing', 'Student engaged in light bullying, teasing, or mockery.', 'Minor', '1st Offense: Written Reprimand'),
('Fighting or causing disturbances', 'Student caused minor physical or verbal disturbances.', 'Minor', '1st Offense: Written Reprimand'),
('Horseplay inside classroom', 'Student participated in rough or playful actions inside class.', 'Minor', '1st Offense: Written Reprimand'),
('Making inappropriate jokes', 'Student shared jokes that were inappropriate or offensive.', 'Minor', '1st Offense: Written Reprimand'),
('Not completing clearance requirements', 'Student failed to accomplish clearance tasks on time.', 'Minor', '1st Offense: Written Reprimand'),
('Taking food without consent', 'Student took food items without permission from the owner.', 'Minor', '1st Offense: Written Reprimand'),
('Not joining required school activities', 'Student refused to join mandatory school events.', 'Minor', '1st Offense: Written Reprimand'),
('Chewing gum or spitting in public', 'Student chewed gum or spat in prohibited areas.', 'Minor', '1st Offense: Written Reprimand'),
('Buying food during class hours', 'Student left class or bought food when not allowed.', 'Minor', '1st Offense: Written Reprimand'),
('Using school properties without permission', 'Student used school equipment without approval.', 'Minor', '1st Offense: Written Reprimand'),
('Forging parent''s signature', 'Student wrote a fake parent or guardian signature.', 'Minor', '1st Offense: Written Reprimand'),
('Misbehavior in the canteen', 'Student acted disruptively in the school canteen.', 'Minor', '1st Offense: Written Reprimand'),
('Disturbing class sessions', 'Student interrupted or distracted ongoing classes.', 'Minor', '1st Offense: Written Reprimand'),
('Unauthorized playing in the gym', 'Student used the gym facilities without permission.', 'Minor', '1st Offense: Written Reprimand'),
('Cheating or academic dishonesty', 'Student engaged in cheating or dishonest academic practices.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Plagiarism', 'Student submitted work copied from others without credit.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Rough or dangerous play', 'Student engaged in actions that could harm others.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Lying or misleading statements', 'Student intentionally gave false or misleading information.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Possession of smoking items', 'Student possessed cigarettes, vapes, or related items.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Vulgar or malicious acts', 'Student committed vulgar or offensive acts towards others.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Bribery or dishonest acts', 'Student attempted to bribe or engage in dishonest conduct.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Theft or aiding theft', 'Student stole or helped others steal property.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Gambling or unauthorized collection', 'Student participated in gambling or unapproved fundraising.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Not delivering official communications', 'Student failed to deliver important school notices.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Rude behavior to visitors or parents', 'Student acted disrespectfully toward guests or parents.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Disrespect to school authorities', 'Student disobeyed or disrespected teachers or staff.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Use of vulgar language repeatedly', 'Student repeatedly used offensive or vulgar language.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Causing chaos during events', 'Student created disorder during school programs.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Disrespect during flag ceremonies', 'Student behaved improperly during the flag ceremony.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Property damage from mischief', 'Student caused damage to school property due to misbehavior.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Skipping class / truancy', 'Student was absent from class without valid reason.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Entering/exiting without permission', 'Student entered or left the campus without authorization.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Public display of affection', 'Student engaged in PDA on school grounds.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Minor vandalism', 'Student committed small-scale vandalism.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Posting unauthorized notices', 'Student posted materials on bulletin boards without approval.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Posting offensive content online', 'Student posted inappropriate or harmful content online.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Removing school announcements', 'Student removed or tampered with posted school announcements.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Gang-like behavior', 'Student displayed behavior associated with gangs.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Cyberbullying', 'Student bullied or harassed others online.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Gross misconduct', 'Student engaged in unacceptable or highly improper behavior.', 'Serious', 'Parent Summons & Guidance Counseling'),
('Forgery or document tampering', 'Student altered or falsified official documents.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Using fake receipts or forms', 'Student used forged receipts or falsified school forms.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Major vandalism', 'Student caused significant damage to school property.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Physical assault', 'Student physically harmed another student or staff.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Stealing school or class funds', 'Student stole money belonging to the school or class.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Extortion or blackmail', 'Student attempted to extort or blackmail another individual.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Immoral or scandalous behavior', 'Student engaged in highly inappropriate behavior.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Possessing pornography', 'Student possessed explicit or pornographic material.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Criminal charges or conviction', 'Student is involved in criminal activity.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Harassment of students/staff', 'Student harassed or intimidated others on campus.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Causing injury requiring hospitalization', 'Student caused injuries that required medical treatment.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Sexual harassment', 'Student committed acts of sexual harassment or misconduct.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Lewd or immoral acts', 'Student participated in obscene or indecent behavior.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Inappropriate social media use', 'Student posted harmful or inappropriate content online.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Leaking confidential school info', 'Student disclosed confidential school information.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Misusing school logo or name', 'Student used the school logo/name without authorization.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Bribing school officials', 'Student attempted to bribe school staff or personnel.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Drinking alcohol in school', 'Student consumed or possessed alcohol on school grounds.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Drug-related activities', 'Student possessed or used illegal drugs.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Bringing deadly weapons', 'Student brought dangerous weapons into school.', 'Major', 'Disciplinary Board Hearing & Suspension'),
('Joining fraternities/sororities', 'Student participated in prohibited fraternity or sorority groups.', 'Major', 'Disciplinary Board Hearing & Suspension');

UPDATE violations AS current_violation
JOIN viotrack_violation_catalog AS catalog
  ON LOWER(TRIM(current_violation.title)) = LOWER(TRIM(catalog.title))
SET
  current_violation.description = IF(current_violation.description IS NULL OR TRIM(current_violation.description) = '', catalog.description, current_violation.description),
  current_violation.`type` = IF(current_violation.`type` IS NULL OR TRIM(current_violation.`type`) = '', catalog.`type`, current_violation.`type`),
  current_violation.default_sanction = IF(current_violation.default_sanction IS NULL OR TRIM(current_violation.default_sanction) = '', catalog.default_sanction, current_violation.default_sanction);

INSERT INTO violations (title, description, `type`, default_sanction)
SELECT catalog.title, catalog.description, catalog.`type`, catalog.default_sanction
FROM viotrack_violation_catalog AS catalog
WHERE NOT EXISTS (
  SELECT 1
  FROM violations AS existing_violation
  WHERE LOWER(TRIM(existing_violation.title)) = LOWER(TRIM(catalog.title))
);

DROP TEMPORARY TABLE viotrack_violation_catalog;
COMMIT;
