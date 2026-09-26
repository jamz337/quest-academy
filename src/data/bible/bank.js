// Bible Village question banks by grade band (A = grades 2-3, B = 4-5, C = 6-8).
// QUIZ: q question, a answer, o wrong options, k skill, ref where to read it.
export const QUIZ = {
  A: [
    { q: 'Who built a big boat to survive the flood?', a: 'Noah', o: ['Moses', 'David', 'Jonah'], k: 'stories', ref: 'Genesis 6' },
    { q: 'How many days and nights did it rain in the flood?', a: '40', o: ['7', '12', '100'], k: 'stories', ref: 'Genesis 7:12' },
    { q: 'Who was swallowed by a big fish?', a: 'Jonah', o: ['Peter', 'Paul', 'Noah'], k: 'stories', ref: 'Jonah 1:17' },
    { q: 'What did David use to defeat Goliath?', a: 'A sling and a stone', o: ['A sword', 'A spear', 'A bow'], k: 'stories', ref: '1 Samuel 17' },
    { q: 'Who was born in Bethlehem and laid in a manger?', a: 'Jesus', o: ['John', 'Moses', 'Samuel'], k: 'stories', ref: 'Luke 2' },
    { q: 'Who led the Israelites out of Egypt?', a: 'Moses', o: ['Abraham', 'Joshua', 'Noah'], k: 'people', ref: 'Exodus 12' },
    { q: 'Which sea did God part so the Israelites could cross?', a: 'The Red Sea', o: ['The Dead Sea', 'The Sea of Galilee', 'The Nile'], k: 'places', ref: 'Exodus 14' },
    { q: 'Who was thrown into the lions’ den?', a: 'Daniel', o: ['Joseph', 'David', 'Elijah'], k: 'stories', ref: 'Daniel 6' },
    { q: 'What was the first man’s name?', a: 'Adam', o: ['Abel', 'Noah', 'Seth'], k: 'people', ref: 'Genesis 2' },
    { q: 'How many disciples did Jesus choose?', a: '12', o: ['7', '10', '40'], k: 'stories', ref: 'Luke 6:13' },
    { q: 'Who received the Ten Commandments on Mount Sinai?', a: 'Moses', o: ['Aaron', 'Joshua', 'David'], k: 'people', ref: 'Exodus 20' },
    { q: 'What did God create on the first day?', a: 'Light', o: ['Animals', 'People', 'Trees'], k: 'stories', ref: 'Genesis 1:3' },
    { q: 'Whose coat had many colours?', a: 'Joseph', o: ['Jacob', 'Isaac', 'Benjamin'], k: 'people', ref: 'Genesis 37' },
    { q: 'Who was the mother of Jesus?', a: 'Mary', o: ['Martha', 'Ruth', 'Sarah'], k: 'people', ref: 'Luke 1' },
    { q: 'What sign did God put in the sky after the flood?', a: 'A rainbow', o: ['A star', 'A cloud', 'The moon'], k: 'stories', ref: 'Genesis 9' },
    { q: 'In which garden did Adam and Eve live?', a: 'Eden', o: ['Gethsemane', 'Galilee', 'Canaan'], k: 'places', ref: 'Genesis 2' },
    { q: 'How many loaves did the boy have when Jesus fed 5,000 people?', a: '5', o: ['2', '7', '12'], k: 'stories', ref: 'John 6:9' },
    { q: 'Who climbed a tree to see Jesus?', a: 'Zacchaeus', o: ['Peter', 'Matthew', 'Lazarus'], k: 'people', ref: 'Luke 19' },
    { q: 'What did Jesus walk on during a storm?', a: 'Water', o: ['Clouds', 'Sand', 'Fire'], k: 'stories', ref: 'Matthew 14' },
    { q: 'Who was David’s best friend?', a: 'Jonathan', o: ['Saul', 'Samuel', 'Goliath'], k: 'people', ref: '1 Samuel 18' }
  ],
  B: [
    { q: 'What is the first book of the Bible?', a: 'Genesis', o: ['Exodus', 'Matthew', 'Psalms'], k: 'books', ref: 'Genesis 1' },
    { q: 'Who was the strong man whose strength was in his hair?', a: 'Samson', o: ['Saul', 'Solomon', 'Simon'], k: 'people', ref: 'Judges 16' },
    { q: 'Which king asked God for wisdom?', a: 'Solomon', o: ['David', 'Saul', 'Ahab'], k: 'people', ref: '1 Kings 3' },
    { q: 'How many plagues came upon Egypt?', a: '10', o: ['7', '12', '40'], k: 'stories', ref: 'Exodus 7–12' },
    { q: 'Who betrayed Jesus for thirty pieces of silver?', a: 'Judas', o: ['Peter', 'Thomas', 'John'], k: 'people', ref: 'Matthew 26' },
    { q: 'On which mountain did Elijah challenge the prophets of Baal?', a: 'Mount Carmel', o: ['Mount Sinai', 'Mount Zion', 'Mount Ararat'], k: 'places', ref: '1 Kings 18' },
    { q: 'Who was the first king of Israel?', a: 'Saul', o: ['David', 'Solomon', 'Samuel'], k: 'people', ref: '1 Samuel 10' },
    { q: 'Which city’s walls fell after the Israelites marched around it?', a: 'Jericho', o: ['Jerusalem', 'Babylon', 'Nineveh'], k: 'places', ref: 'Joshua 6' },
    { q: 'Who denied knowing Jesus three times?', a: 'Peter', o: ['Judas', 'James', 'Andrew'], k: 'people', ref: 'Luke 22' },
    { q: 'Who was sold into slavery by his brothers?', a: 'Joseph', o: ['Benjamin', 'Jacob', 'Esau'], k: 'stories', ref: 'Genesis 37' },
    { q: 'Which prophet was taken to heaven in a chariot of fire?', a: 'Elijah', o: ['Elisha', 'Isaiah', 'Enoch'], k: 'people', ref: '2 Kings 2' },
    { q: 'What did Jesus turn water into at a wedding in Cana?', a: 'Wine', o: ['Bread', 'Milk', 'Oil'], k: 'stories', ref: 'John 2' },
    { q: 'Who was Ruth’s mother-in-law?', a: 'Naomi', o: ['Esther', 'Hannah', 'Deborah'], k: 'people', ref: 'Ruth 1' },
    { q: 'Which queen risked her life to save her people?', a: 'Esther', o: ['Ruth', 'Delilah', 'Jezebel'], k: 'people', ref: 'Esther 4' },
    { q: 'How many books are in the Bible?', a: '66', o: ['39', '27', '100'], k: 'books', ref: 'Contents page' },
    { q: 'Which tax collector became a disciple of Jesus?', a: 'Matthew', o: ['Mark', 'Luke', 'Paul'], k: 'people', ref: 'Matthew 9' },
    { q: 'Who baptised Jesus in the Jordan River?', a: 'John the Baptist', o: ['Peter', 'Andrew', 'Elijah'], k: 'people', ref: 'Matthew 3' },
    { q: 'Whom did Jesus raise from the dead after four days?', a: 'Lazarus', o: ['Jairus', 'Stephen', 'Nicodemus'], k: 'stories', ref: 'John 11' },
    { q: 'Who wrote many of the Psalms?', a: 'David', o: ['Solomon', 'Moses', 'Paul'], k: 'books', ref: 'Psalms' },
    { q: 'Which disciple doubted until he saw Jesus’ wounds?', a: 'Thomas', o: ['Philip', 'Peter', 'James'], k: 'people', ref: 'John 20' }
  ],
  C: [
    { q: 'How many books are in the New Testament?', a: '27', o: ['39', '66', '12'], k: 'books', ref: 'Contents page' },
    { q: 'Which apostle to the Gentiles was formerly called Saul?', a: 'Paul', o: ['Peter', 'Barnabas', 'Stephen'], k: 'people', ref: 'Acts 13' },
    { q: 'On which road was Saul blinded by a light from heaven?', a: 'The road to Damascus', o: ['The road to Emmaus', 'The road to Jericho', 'The road to Rome'], k: 'places', ref: 'Acts 9' },
    { q: 'Which book comes last in the Bible?', a: 'Revelation', o: ['Jude', 'Acts', 'Malachi'], k: 'books', ref: 'Revelation' },
    { q: 'Who was the first Christian martyr?', a: 'Stephen', o: ['James', 'Paul', 'Philip'], k: 'people', ref: 'Acts 7' },
    { q: 'Who interpreted King Nebuchadnezzar’s dreams?', a: 'Daniel', o: ['Joseph', 'Ezekiel', 'Jeremiah'], k: 'people', ref: 'Daniel 2' },
    { q: 'Which prophet was told to marry Gomer?', a: 'Hosea', o: ['Amos', 'Micah', 'Joel'], k: 'people', ref: 'Hosea 1' },
    { q: 'Who rebuilt the walls of Jerusalem?', a: 'Nehemiah', o: ['Ezra', 'Zerubbabel', 'Haggai'], k: 'people', ref: 'Nehemiah 2' },
    { q: 'How many years did the Israelites wander in the wilderness?', a: '40', o: ['7', '12', '70'], k: 'stories', ref: 'Numbers 14' },
    { q: 'What is the longest book of the Bible?', a: 'Psalms', o: ['Isaiah', 'Genesis', 'Jeremiah'], k: 'books', ref: 'Psalms' },
    { q: 'Which Gospel writer was a doctor?', a: 'Luke', o: ['Matthew', 'Mark', 'John'], k: 'books', ref: 'Colossians 4:14' },
    { q: 'Who was the high priest and brother of Moses?', a: 'Aaron', o: ['Joshua', 'Caleb', 'Eleazar'], k: 'people', ref: 'Exodus 28' },
    { q: 'On which island was John when he wrote Revelation?', a: 'Patmos', o: ['Cyprus', 'Crete', 'Malta'], k: 'places', ref: 'Revelation 1:9' },
    { q: 'Who succeeded Moses as leader of Israel?', a: 'Joshua', o: ['Caleb', 'Aaron', 'Gideon'], k: 'people', ref: 'Joshua 1' },
    { q: 'In which garden did Jesus pray before his arrest?', a: 'Gethsemane', o: ['Eden', 'Bethany', 'Galilee'], k: 'places', ref: 'Matthew 26' },
    { q: 'Which judge defeated the Midianites with only 300 men?', a: 'Gideon', o: ['Samson', 'Deborah', 'Jephthah'], k: 'people', ref: 'Judges 7' },
    { q: 'Which two books of the Bible are named after women?', a: 'Ruth and Esther', o: ['Mary and Martha', 'Ruth and Naomi', 'Esther and Deborah'], k: 'books', ref: 'Ruth; Esther' },
    { q: 'Who wrote the most letters in the New Testament?', a: 'Paul', o: ['Peter', 'John', 'James'], k: 'books', ref: 'Romans–Philemon' },
    { q: 'In which city was Jesus crucified?', a: 'Jerusalem', o: ['Bethlehem', 'Nazareth', 'Capernaum'], k: 'places', ref: 'Luke 23' },
    { q: 'Which Roman governor sentenced Jesus?', a: 'Pontius Pilate', o: ['Herod', 'Caesar', 'Felix'], k: 'people', ref: 'Matthew 27' }
  ]
};

// VERSES: t verse with ___ for the missing word, a answer, o wrong words, ref reference.
export const VERSES = {
  A: [
    { t: 'In the beginning God created the heavens and the ___.', a: 'earth', o: ['sea', 'sun', 'moon'], ref: 'Genesis 1:1' },
    { t: 'The Lord is my ___, I shall not want.', a: 'shepherd', o: ['king', 'friend', 'light'], ref: 'Psalm 23:1' },
    { t: 'For God so loved the ___ that he gave his one and only Son.', a: 'world', o: ['city', 'church', 'people'], ref: 'John 3:16' },
    { t: 'Love your ___ as yourself.', a: 'neighbour', o: ['friend', 'family', 'teacher'], ref: 'Mark 12:31' },
    { t: 'Children, obey your ___ in the Lord.', a: 'parents', o: ['teachers', 'friends', 'leaders'], ref: 'Ephesians 6:1' },
    { t: 'Give thanks to the Lord, for he is ___.', a: 'good', o: ['great', 'king', 'near'], ref: 'Psalm 107:1' },
    { t: 'Jesus ___.', a: 'wept', o: ['sang', 'ran', 'slept'], ref: 'John 11:35' },
    { t: 'I can do all things through ___ who strengthens me.', a: 'Christ', o: ['friends', 'prayer', 'faith'], ref: 'Philippians 4:13' },
    { t: 'Be ___ and courageous.', a: 'strong', o: ['brave', 'kind', 'quiet'], ref: 'Joshua 1:9' },
    { t: 'Your word is a lamp to my ___.', a: 'feet', o: ['eyes', 'hands', 'heart'], ref: 'Psalm 119:105' },
    { t: 'Let the little ___ come to me.', a: 'children', o: ['birds', 'sheep', 'people'], ref: 'Matthew 19:14' },
    { t: 'Trust in the Lord with all your ___.', a: 'heart', o: ['mind', 'might', 'days'], ref: 'Proverbs 3:5' }
  ],
  B: [
    { t: 'The Lord is my light and my ___.', a: 'salvation', o: ['shield', 'strength', 'song'], ref: 'Psalm 27:1' },
    { t: 'Do not be anxious about ___.', a: 'anything', o: ['tomorrow', 'money', 'food'], ref: 'Philippians 4:6' },
    { t: 'Be kind and ___ to one another.', a: 'compassionate', o: ['gentle', 'patient', 'fair'], ref: 'Ephesians 4:32' },
    { t: 'The fear of the Lord is the beginning of ___.', a: 'wisdom', o: ['courage', 'joy', 'life'], ref: 'Proverbs 9:10' },
    { t: 'Seek first the kingdom of God and his ___.', a: 'righteousness', o: ['glory', 'temple', 'people'], ref: 'Matthew 6:33' },
    { t: 'Rejoice in the Lord ___.', a: 'always', o: ['today', 'quietly', 'together'], ref: 'Philippians 4:4' },
    { t: 'Blessed are the ___, for they shall see God.', a: 'pure in heart', o: ['meek', 'poor', 'merciful'], ref: 'Matthew 5:8' },
    { t: 'I am the way, the truth, and the ___.', a: 'life', o: ['light', 'door', 'gate'], ref: 'John 14:6' },
    { t: 'Cast all your ___ on him because he cares for you.', a: 'anxiety', o: ['hopes', 'sins', 'plans'], ref: '1 Peter 5:7' },
    { t: 'For all have sinned and fall short of the ___ of God.', a: 'glory', o: ['love', 'law', 'house'], ref: 'Romans 3:23' },
    { t: 'Honour your father and your ___.', a: 'mother', o: ['brother', 'elders', 'king'], ref: 'Exodus 20:12' },
    { t: 'The Lord is my rock, my fortress and my ___.', a: 'deliverer', o: ['teacher', 'banner', 'judge'], ref: 'Psalm 18:2' }
  ],
  C: [
    { t: 'For the wages of sin is death, but the gift of God is ___ life.', a: 'eternal', o: ['a new', 'abundant', 'holy'], ref: 'Romans 6:23' },
    { t: 'Faith is the assurance of things ___ for.', a: 'hoped', o: ['asked', 'waited', 'longed'], ref: 'Hebrews 11:1' },
    { t: 'The Lord is ___ to anger and abounding in love.', a: 'slow', o: ['quick', 'blind', 'near'], ref: 'Psalm 103:8' },
    { t: 'For I know the ___ I have for you, declares the Lord.', a: 'plans', o: ['love', 'hope', 'gifts'], ref: 'Jeremiah 29:11' },
    { t: 'Be transformed by the renewing of your ___.', a: 'mind', o: ['soul', 'life', 'spirit'], ref: 'Romans 12:2' },
    { t: 'The heavens declare the ___ of God.', a: 'glory', o: ['power', 'name', 'works'], ref: 'Psalm 19:1' },
    { t: 'Love is patient, love is ___.', a: 'kind', o: ['true', 'brave', 'wise'], ref: '1 Corinthians 13:4' },
    { t: 'In the beginning was the ___.', a: 'Word', o: ['light', 'world', 'law'], ref: 'John 1:1' },
    { t: 'Whatever you do, work at it with all your ___, as working for the Lord.', a: 'heart', o: ['might', 'skill', 'mind'], ref: 'Colossians 3:23' },
    { t: 'Create in me a clean heart, O God, and renew a right ___ within me.', a: 'spirit', o: ['mind', 'hope', 'path'], ref: 'Psalm 51:10' },
    { t: 'But those who hope in the Lord will renew their ___.', a: 'strength', o: ['faith', 'hearts', 'days'], ref: 'Isaiah 40:31' },
    { t: 'Let your ___ shine before others.', a: 'light', o: ['love', 'faith', 'joy'], ref: 'Matthew 5:16' }
  ]
};

// PAIRS for "Who Am I?": l person, r what they did (reads after "Who ..."), k skill. At least 15 per band (3 rounds of 5).
export const PAIRS = {
  A: [
    { l: 'Noah', r: 'built the ark', k: 'people' }, { l: 'Moses', r: 'parted the Red Sea', k: 'people' },
    { l: 'David', r: 'beat Goliath', k: 'people' }, { l: 'Jonah', r: 'was swallowed by a fish', k: 'people' },
    { l: 'Daniel', r: 'was safe in the lions’ den', k: 'people' }, { l: 'Mary', r: 'was the mother of Jesus', k: 'people' },
    { l: 'Joseph', r: 'had a coat of many colours', k: 'people' }, { l: 'Adam', r: 'was the first man', k: 'people' },
    { l: 'Eve', r: 'was the first woman', k: 'people' }, { l: 'Abraham', r: 'was promised a great nation', k: 'people' },
    { l: 'Jesus', r: 'was born in Bethlehem', k: 'people' }, { l: 'Zacchaeus', r: 'climbed a tree to see Jesus', k: 'people' },
    { l: 'Peter', r: 'was a fisherman who followed Jesus', k: 'people' }, { l: 'Goliath', r: 'was the giant', k: 'people' },
    { l: 'Samson', r: 'was very strong', k: 'people' }, { l: 'Esther', r: 'was a brave queen', k: 'people' },
    { l: 'Joshua', r: 'marched around Jericho', k: 'people' }
  ],
  B: [
    { l: 'Solomon', r: 'was the wisest king', k: 'people' }, { l: 'Saul', r: 'was the first king of Israel', k: 'people' },
    { l: 'Elijah', r: 'went to heaven in a chariot of fire', k: 'people' }, { l: 'Ruth', r: 'stayed loyal to Naomi', k: 'people' },
    { l: 'Judas', r: 'betrayed Jesus', k: 'people' }, { l: 'Thomas', r: 'doubted until he saw Jesus', k: 'people' },
    { l: 'Matthew', r: 'was a tax collector', k: 'people' }, { l: 'Lazarus', r: 'was raised from the dead', k: 'people' },
    { l: 'John the Baptist', r: 'baptised Jesus', k: 'people' }, { l: 'Isaac', r: 'was the son of Abraham', k: 'people' },
    { l: 'Jacob', r: 'wrestled with God all night', k: 'people' }, { l: 'Deborah', r: 'was a judge of Israel', k: 'people' },
    { l: 'Gideon', r: 'won with 300 soldiers', k: 'people' }, { l: 'Elisha', r: 'picked up Elijah’s cloak', k: 'people' },
    { l: 'Miriam', r: 'was the sister of Moses', k: 'people' }, { l: 'Nehemiah', r: 'rebuilt the walls of Jerusalem', k: 'people' },
    { l: 'Rebekah', r: 'was the wife of Isaac', k: 'people' }
  ],
  C: [
    { l: 'Paul', r: 'was the apostle to the Gentiles', k: 'people' }, { l: 'Stephen', r: 'was the first martyr', k: 'people' },
    { l: 'Luke', r: 'was a doctor who wrote a Gospel', k: 'people' }, { l: 'Timothy', r: 'was Paul’s young helper', k: 'people' },
    { l: 'Barnabas', r: 'travelled with Paul and encouraged others', k: 'people' }, { l: 'Nebuchadnezzar', r: 'was king of Babylon', k: 'people' },
    { l: 'Ezekiel', r: 'saw the valley of dry bones', k: 'people' }, { l: 'Hosea', r: 'married Gomer', k: 'people' },
    { l: 'Job', r: 'suffered and stayed faithful', k: 'people' }, { l: 'Isaiah', r: 'foretold the coming Messiah', k: 'people' },
    { l: 'Jeremiah', r: 'was the weeping prophet', k: 'people' }, { l: 'Pontius Pilate', r: 'was the Roman governor at the trial of Jesus', k: 'people' },
    { l: 'Nicodemus', r: 'visited Jesus at night', k: 'people' }, { l: 'Mary Magdalene', r: 'first saw the risen Jesus', k: 'people' },
    { l: 'Caleb', r: 'was a faithful spy', k: 'people' }, { l: 'Melchizedek', r: 'was priest and king of Salem', k: 'people' },
    { l: 'Lydia', r: 'sold purple cloth', k: 'people' }
  ]
};

// ORDER for "put the story in order": title and the events in the right order (shown shuffled).
export const ORDER = {
  A: [
    { title: 'Noah and the flood', steps: ['God tells Noah to build an ark', 'The animals go in two by two', 'It rains for forty days', 'A rainbow appears in the sky'], ref: 'Genesis 6–9' },
    { title: 'David and Goliath', steps: ['Goliath challenges the Israelites', 'David picks five smooth stones', 'David swings his sling', 'Goliath falls down'], ref: '1 Samuel 17' },
    { title: 'Jonah', steps: ['God tells Jonah to go to Nineveh', 'Jonah sails the other way', 'A big fish swallows Jonah', 'Jonah goes to Nineveh at last'], ref: 'Jonah 1–3' },
    { title: 'The birth of Jesus', steps: ['Mary and Joseph travel to Bethlehem', 'There is no room at the inn', 'Jesus is born and laid in a manger', 'Shepherds come to see him'], ref: 'Luke 2' },
    { title: 'Creation', steps: ['God makes light', 'God makes the sea and the land', 'God makes the animals', 'God rests on the seventh day'], ref: 'Genesis 1–2' }
  ],
  B: [
    { title: 'Joseph', steps: ['Joseph gets a coat of many colours', 'His brothers sell him into Egypt', 'Joseph explains Pharaoh’s dreams', 'Joseph forgives his brothers'], ref: 'Genesis 37–45' },
    { title: 'Moses and the Exodus', steps: ['Moses sees the burning bush', 'Ten plagues come upon Egypt', 'The Red Sea parts', 'Moses receives the Ten Commandments'], ref: 'Exodus 3–20' },
    { title: 'Daniel', steps: ['Daniel is taken to Babylon', 'Daniel keeps praying to God', 'Daniel is thrown to the lions', 'God shuts the lions’ mouths'], ref: 'Daniel 1–6' },
    { title: 'Easter', steps: ['Jesus rides into Jerusalem', 'Jesus shares the Last Supper', 'Jesus dies on the cross', 'Jesus rises on the third day'], ref: 'Luke 19–24' },
    { title: 'Ruth', steps: ['Naomi’s husband and sons die', 'Ruth stays with Naomi', 'Ruth gathers grain in Boaz’s field', 'Ruth marries Boaz'], ref: 'Ruth 1–4' }
  ],
  C: [
    { title: 'Paul', steps: ['Saul persecutes the church', 'A light blinds Saul on the road to Damascus', 'Paul preaches on missionary journeys', 'Paul writes letters from prison'], ref: 'Acts 9–28' },
    { title: 'Esther', steps: ['Esther becomes queen', 'Haman plots against the Jews', 'Esther risks her life before the king', 'The Jews are saved'], ref: 'Esther 2–9' },
    { title: 'Elijah', steps: ['Ravens feed Elijah by the brook', 'Elijah challenges the prophets of Baal', 'Fire falls on the altar', 'Elijah goes to heaven in a chariot'], ref: '1 Kings 17 – 2 Kings 2' },
    { title: 'The early church', steps: ['Jesus returns to heaven', 'The Holy Spirit comes at Pentecost', 'Stephen becomes the first martyr', 'Peter is freed from prison'], ref: 'Acts 1–12' },
    { title: 'Nehemiah', steps: ['Nehemiah hears the walls are broken', 'The king lets him go to Jerusalem', 'The people rebuild the walls', 'Ezra reads the law to everyone'], ref: 'Nehemiah 1–8' }
  ]
};
