-- Pest Control Dummy Data for D1

DELETE FROM messages;
DELETE FROM call_events;
DELETE FROM calls;
DELETE FROM contacts;

-- Contacts
INSERT INTO contacts (id, name, phone, address, pestpac_location_number) VALUES
  ('c1','Margaret Collins','+12145550101','4821 Oak Creek Dr, Dallas TX 75201','PC-10421'),
  ('c2','James Whitfield','+14695550202','913 Pecan Ridge Rd, Plano TX 75023','PC-10422'),
  ('c3','Sandra Torres','+19725550303','2207 Mesquite Ln, Irving TX 75061','PC-10423'),
  ('c4','Robert Nguyen','+18175550404','5504 Bluebonnet Blvd, Fort Worth TX 76107','PC-10424'),
  ('c5','Linda Garza','+19405550505','330 Cedar Hollow Dr, Denton TX 76201','PC-10425'),
  ('c6','Thomas Brennan','+14695550606','7718 Willow Creek Ct, Frisco TX 75034','PC-10426'),
  ('c7','Patricia Owens','+12145550707','1145 Sunset Ridge Ave, Arlington TX 76010','PC-10427'),
  ('c8','David Kim','+19725550808','6602 Creekside Trail, McKinney TX 75070','PC-10428');

-- Calls
INSERT INTO calls (id, call_sid, direction, from_number, to_number, status, answered_by, duration_seconds, started_at, ended_at, ai_summary, transcript_text, disposition, score) VALUES
  ('call1','CA001','inbound','+12145550101','+18005559876','completed','agent',342,
   '2026-05-27 07:00:00','2026-05-27 07:05:42',
   'Customer reported heavy cockroach activity in kitchen and bathroom. Recommended quarterly service plan. Scheduled inspection for next Tuesday.',
   'Agent: Thank you for calling BugHub Pest Control, how can I help you?
Customer: Hi, I have a serious cockroach problem in my kitchen and bathroom, they are everywhere.
Agent: I am sorry to hear that. When did you first notice the infestation?
Customer: About two weeks ago, but it is getting worse every day.
Agent: I would like to schedule an inspection for you. We can have a technician out on Tuesday.
Customer: That works great, thank you.',
   'Scheduled','88'),

  ('call2','CA002','outbound','+18005559876','+14695550202','completed','agent',217,
   '2026-05-27 08:00:00','2026-05-27 08:03:37',
   'Follow-up call for termite treatment completed last week. Customer satisfied with results. No signs of re-infestation reported.',
   'Agent: Good morning, is this James Whitfield?
Customer: Yes, speaking.
Agent: This is Alex from BugHub calling to follow up on your termite treatment last week.
Customer: Oh yes, things look much better. I have not seen any activity since the treatment.
Agent: Excellent. We will schedule your 30-day follow-up inspection automatically.',
   'Resolved','92'),

  ('call3','CA003','inbound','+19725550303','+18005559876','completed','agent',189,
   '2026-05-27 09:00:00','2026-05-27 09:03:09',
   'Customer concerned about wasp nest near back porch. Urgent same-day service requested. Dispatched technician within 2 hours.',
   'Agent: BugHub Pest Control, how may I assist you?
Customer: I need someone out today. There is a huge wasp nest right above my back door and my kids cannot go outside.
Agent: I completely understand, that is a safety concern. Let me check our same-day availability.
Customer: Please, it is an emergency.
Agent: I have a technician available this afternoon around 2 PM. Does that work?
Customer: Yes, perfect, thank you so much.',
   'Scheduled','95'),

  ('call4','CA004','inbound','+18175550404','+18005559876','no-answer',NULL,0,
   '2026-05-27 10:00:00','2026-05-27 10:00:30',
   NULL,NULL,'No Answer','0'),

  ('call5','CA005','inbound','+19405550505','+18005559876','completed','agent',405,
   '2026-05-27 10:30:00','2026-05-27 10:36:45',
   'Customer reporting rodent activity in attic and garage. Signed up for annual protection plan including two follow-up visits.',
   'Agent: Thank you for calling BugHub, this is Sarah.
Customer: I keep hearing scratching in my attic at night. I think I have rats.
Agent: That is a common issue this time of year. Have you noticed any droppings or entry points?
Customer: Yes there are droppings near the garage door and I can smell something.
Agent: I would like to set you up with our Rodent Protection Plan. It includes initial treatment plus two follow-up visits.
Customer: That sounds like exactly what I need. Let us go ahead.',
   'Scheduled','90'),

  ('call6','CA006','outbound','+18005559876','+14695550606','completed','agent',158,
   '2026-05-27 11:15:00','2026-05-27 11:17:38',
   'Renewal call for annual bed bug protection plan. Customer confirmed renewal. Payment processed successfully.',
   'Agent: Hi Thomas, calling from BugHub about your annual plan renewal coming up on the 30th.
Customer: Oh right, yes I want to renew. No issues this year at all.
Agent: That is wonderful to hear. Shall I process the renewal on your card on file?
Customer: Yes go ahead.
Agent: Done. You are all set for another year of protection.',
   'Resolved','85'),

  ('call7','CA007','inbound','+12145550707','+18005559876','completed','agent',276,
   '2026-05-27 12:00:00','2026-05-27 12:04:36',
   'Customer with active fire ant infestation in yard. Explained mound treatment process. Booked weekend appointment.',
   'Agent: BugHub Pest Control, how can I help?
Customer: I have fire ants all over my front yard. My dog got stung twice yesterday.
Agent: Oh no, I am sorry about your dog. Fire ants can be very aggressive this season.
Customer: Can you come this weekend?
Agent: Absolutely. Saturday morning works. We will treat all visible mounds and apply a perimeter barrier.
Customer: Great, Saturday works perfectly.',
   'Scheduled','87'),

  ('call8','CA008','inbound','+19725550808','+18005559876','in-progress',NULL,NULL,
   '2026-05-27 12:55:00',NULL,
   NULL,NULL,NULL,NULL);

-- SMS Messages
INSERT INTO messages (id, channel, message_sid, from_number, to_number, body, created_at) VALUES
  ('m1','sms','SM001','+12145550101','+18005559876','Hi, I wanted to confirm my appointment for Tuesday at 10am for the cockroach inspection.','2026-05-27 07:10:00'),
  ('m2','sms','SM002','+18005559876','+12145550101','Hi Margaret! Your appointment is confirmed for Tuesday at 10:00 AM. Our technician Alex will be there. See you then!','2026-05-27 07:15:00'),
  ('m3','sms','SM003','+12145550101','+18005559876','Thank you! Will they need access to the backyard?','2026-05-27 07:20:00'),
  ('m4','sms','SM004','+18005559876','+12145550101','Yes, please ensure the gate is unlocked. They will inspect both interior and exterior. Any questions just reply here.','2026-05-27 07:25:00'),
  ('m5','sms','SM005','+14695550202','+18005559876','Hey just wanted to say the termite treatment worked great. No more activity at all. You guys are the best!','2026-05-27 08:30:00'),
  ('m6','sms','SM006','+18005559876','+14695550202','So glad to hear that James! Your 30-day follow-up is scheduled for June 10. We will send a reminder the day before.','2026-05-27 08:35:00'),
  ('m7','sms','SM007','+19725550303','+18005559876','The technician just left. Wasp nest is completely gone! My kids can finally go outside again. Amazing service.','2026-05-27 09:45:00'),
  ('m8','sms','SM008','+18005559876','+19725550303','Excellent Sandra! We are so glad we could help quickly. We will check in with you in 2 weeks to make sure there is no return activity.','2026-05-27 09:50:00'),
  ('m9','sms','SM009','+19405550505','+18005559876','Quick question - do I need to vacate the house during the rodent treatment?','2026-05-27 11:00:00'),
  ('m10','sms','SM010','+18005559876','+19405550505','Hi Linda! No need to leave during exterior treatment. We will let you know if interior bait stations require any prep. See you Thursday!','2026-05-27 11:05:00'),
  ('m11','sms','SM011','+12145550707','+18005559876','Saturday morning confirmed. What time exactly? I have a soccer game at noon.','2026-05-27 12:05:00'),
  ('m12','sms','SM012','+18005559876','+12145550707','Hi Patricia! 8:30 AM - should be done well before noon. Fire ant treatment takes about 45 minutes.','2026-05-27 12:10:00'),
  ('m13','sms','SM013','+12145550707','+18005559876','Perfect, thank you!','2026-05-27 12:12:00');
