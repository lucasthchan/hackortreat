// Names for the people database. Every first name and last name has `cities`: the cities where
// that name is usual. The generator picks a city first, then a first name that fits the city,
// then a last name that fits both the city and the first name's culture.
//
// Names are written the way locals write them, and each culture's naming custom is encoded:
//   order: 'given-first'   → "Grace Okafor"
//          'family-first'  → "Tanaka Hiroshi", "Nguyễn Thị Lan", "Kovács Zoltán"
//          'initial-given' → "G. Batbayar" (Mongolian: father's-name initial, then given name)
//   last names may be gendered    → { m: 'Ivanov', f: 'Ivanova' }; a name with only one form is used for that gender only
//   count: 2                      → two surnames (paternal + maternal), e.g. "María González López"
//   connector                     → "Nurul Huda binti Ahmad", "Rajesh s/o Krishnan"
//   with                          → which last-name cultures a first name combines with (defaults to its own culture)

/* ---------- city groups ---------- */
const NORTH_AMERICA = ['Toronto', 'Vancouver', 'Montreal', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Denver', 'Anchorage', 'Honolulu', 'Salem'];
const BRITISH_ISLES = ['London', 'Dublin', 'Edinburgh'];
const OCEANIA_ANGLO = ['Perth', 'Darwin', 'Sydney', 'Melbourne', 'Auckland'];
const SOUTH_AFRICA = ['Johannesburg', 'Cape Town'];
const US_HISPANIC = ['Los Angeles', 'Houston', 'New York', 'Chicago', 'Denver'];
const LATAM_TWO_SURNAMES = ['Mexico City', 'Havana', 'Bogotá', 'Lima', 'Santiago', 'Madrid'];
const LUSOPHONE = ['Lisbon', 'São Paulo', 'Rio de Janeiro', 'Manaus'];
const RUSSIA = ['Moscow', 'Novosibirsk', 'Vladivostok'];
const MAINLAND_CHINA = ['Beijing', 'Shanghai', 'Chengdu'];
const JAPAN = ['Tokyo', 'Osaka'];

/* ---------- first names ---------- */
const FIRST = [
    {
        culture: 'English', order: 'given-first',
        cities: [...NORTH_AMERICA, ...BRITISH_ISLES, ...OCEANIA_ANGLO, ...SOUTH_AFRICA, 'Lagos', 'Accra', 'Nairobi', 'Dubai'],
        with: ['English', 'Irish', 'Scottish', 'Spanish (one surname)', 'French Canadian', 'Cantonese', 'Korean', 'Japanese',
            'Hawaiian', 'Māori', 'Afrikaans', 'Nguni', 'Nigerian', 'Ghanaian', 'Kenyan', 'North Indian', 'Gujarati/Marathi'],
        m: ['James', 'John', 'Michael', 'David', 'Robert', 'William', 'Daniel', 'Matthew', 'Andrew', 'Thomas', 'Christopher',
            'Ryan', 'Kevin', 'Mark', 'Peter', 'Paul', 'Steven', 'Brian', 'George', 'Jack', 'Oliver', 'Liam', 'Ethan', 'Samuel'],
        f: ['Mary', 'Sarah', 'Jennifer', 'Emily', 'Jessica', 'Elizabeth', 'Emma', 'Olivia', 'Charlotte', 'Grace', 'Hannah',
            'Rachel', 'Karen', 'Michelle', 'Laura', 'Rebecca', 'Amy', 'Sophie', 'Chloe', 'Megan', 'Lucy', 'Patricia', 'Joy', 'Faith'],
    },
    {
        culture: 'Irish', order: 'given-first', cities: ['Dublin'], with: ['Irish'],
        m: ['Seán', 'Ciarán', 'Conor', 'Darragh', 'Cian', 'Oisín', 'Pádraig', 'Eoin'],
        f: ['Aoife', 'Siobhán', 'Niamh', 'Saoirse', 'Róisín', 'Caoimhe', 'Clodagh', 'Gráinne'],
    },
    {
        culture: 'Scottish', order: 'given-first', cities: ['Edinburgh'], with: ['Scottish', 'English'],
        m: ['Hamish', 'Callum', 'Euan', 'Fraser', 'Alasdair', 'Lachlan', 'Angus', 'Ruaridh'],
        f: ['Isla', 'Ailsa', 'Morag', 'Eilidh', 'Fiona', 'Kirsty', 'Mhairi', 'Catriona'],
    },
    {
        culture: 'Hawaiian', order: 'given-first', cities: ['Honolulu'], with: ['Hawaiian', 'English', 'Japanese'],
        m: ['Keoni', 'Kai', 'Makoa', 'Kawika', 'Ikaika', 'Kekoa'],
        f: ['Leilani', 'Malia', 'Noelani', 'Kalani', 'Keala', 'Mahina'],
    },
    {
        culture: 'Māori', order: 'given-first', cities: ['Auckland'], with: ['Māori', 'English'],
        m: ['Wiremu', 'Tamati', 'Rawiri', 'Hemi', 'Nikau', 'Mikaere'],
        f: ['Aroha', 'Mere', 'Ngaio', 'Kiri', 'Huia', 'Anahera'],
    },
    {
        culture: 'French', order: 'given-first', cities: ['Paris', 'Montreal'], with: ['French', 'French Canadian'],
        m: ['Jean', 'Pierre', 'Louis', 'Mathieu', 'Nicolas', 'Antoine', 'Julien', 'Guillaume', 'François', 'Étienne', 'Jean-François', 'Benoît'],
        f: ['Marie', 'Camille', 'Chloé', 'Léa', 'Manon', 'Julie', 'Sophie', 'Élodie', 'Isabelle', 'Geneviève', 'Marie-Ève', 'Nathalie'],
    },
    {
        culture: 'Spanish', order: 'given-first', cities: [...LATAM_TWO_SURNAMES, 'Buenos Aires', ...US_HISPANIC],
        with: ['Spanish', 'Spanish (one surname)', 'Italian'],
        m: ['José', 'Juan', 'Carlos', 'Luis', 'Javier', 'Miguel', 'Alejandro', 'Diego', 'Andrés', 'Sebastián', 'Fernando', 'Jorge', 'Juan Pablo', 'José Luis'],
        f: ['María', 'Ana', 'Carmen', 'Lucía', 'Sofía', 'Valentina', 'Camila', 'Gabriela', 'Daniela', 'Paula', 'María José', 'Ximena', 'Guadalupe', 'Rosa'],
    },
    {
        culture: 'Portuguese', order: 'given-first', cities: LUSOPHONE, with: ['Portuguese', 'Japanese'],
        m: ['João', 'Pedro', 'Lucas', 'Gabriel', 'Rafael', 'Miguel', 'Tiago', 'Felipe', 'Bruno', 'Matheus', 'João Pedro', 'Antônio'],
        f: ['Maria', 'Ana', 'Beatriz', 'Júlia', 'Mariana', 'Larissa', 'Fernanda', 'Inês', 'Leonor', 'Ana Clara', 'Francisca', 'Luana'],
    },
    {
        culture: 'Italian', order: 'given-first', cities: ['Rome'],
        m: ['Marco', 'Luca', 'Giuseppe', 'Alessandro', 'Francesco', 'Matteo', 'Andrea', 'Giovanni', 'Lorenzo', 'Davide'],
        f: ['Giulia', 'Francesca', 'Chiara', 'Sara', 'Martina', 'Alessia', 'Valentina', 'Elena', 'Federica', 'Silvia'],
    },
    {
        culture: 'German', order: 'given-first', cities: ['Berlin'],
        m: ['Lukas', 'Jonas', 'Maximilian', 'Felix', 'Paul', 'Stefan', 'Thomas', 'Michael', 'Jan', 'Tobias', 'Jürgen', 'Klaus'],
        f: ['Anna', 'Lena', 'Laura', 'Julia', 'Katharina', 'Sabine', 'Hannah', 'Lea', 'Johanna', 'Ursula', 'Petra', 'Monika'],
    },
    {
        culture: 'Dutch', order: 'given-first', cities: ['Amsterdam'],
        m: ['Daan', 'Sem', 'Lucas', 'Bram', 'Thijs', 'Jeroen', 'Pieter', 'Ruben', 'Joost', 'Wouter'],
        f: ['Emma', 'Julia', 'Sanne', 'Fleur', 'Anouk', 'Lotte', 'Femke', 'Sophie', 'Marieke', 'Ilse'],
    },
    {
        culture: 'Swedish', order: 'given-first', cities: ['Stockholm'],
        m: ['Erik', 'Lars', 'Anders', 'Johan', 'Karl', 'Oskar', 'Nils', 'Gustav', 'Mikael', 'Per'],
        f: ['Anna', 'Maria', 'Elin', 'Ebba', 'Sara', 'Karin', 'Ingrid', 'Linnea', 'Astrid', 'Maja'],
    },
    {
        culture: 'Norwegian', order: 'given-first', cities: ['Oslo'],
        m: ['Ole', 'Lars', 'Henrik', 'Magnus', 'Jakob', 'Sindre', 'Erlend', 'Håkon', 'Knut', 'Bjørn'],
        f: ['Ingrid', 'Nora', 'Sigrid', 'Kari', 'Ida', 'Solveig', 'Ragnhild', 'Maja', 'Astrid', 'Live'],
    },
    {
        culture: 'Icelandic', order: 'given-first', cities: ['Reykjavík'],
        m: ['Jón', 'Sigurður', 'Guðmundur', 'Gunnar', 'Ólafur', 'Einar', 'Kristján', 'Magnús', 'Stefán', 'Helgi'],
        f: ['Guðrún', 'Anna', 'Kristín', 'Sigríður', 'Margrét', 'Helga', 'Sigrún', 'Ingibjörg', 'Katrín', 'Björk'],
    },
    {
        culture: 'Czech', order: 'given-first', cities: ['Prague'],
        m: ['Jan', 'Petr', 'Jiří', 'Pavel', 'Tomáš', 'Martin', 'Jakub', 'Lukáš', 'Josef', 'Ondřej'],
        f: ['Jana', 'Eva', 'Hana', 'Lenka', 'Petra', 'Lucie', 'Tereza', 'Kateřina', 'Markéta', 'Veronika'],
    },
    {
        culture: 'Polish', order: 'given-first', cities: ['Warsaw'],
        m: ['Piotr', 'Krzysztof', 'Tomasz', 'Paweł', 'Michał', 'Marcin', 'Jakub', 'Łukasz', 'Andrzej', 'Wojciech'],
        f: ['Anna', 'Katarzyna', 'Magdalena', 'Agnieszka', 'Joanna', 'Małgorzata', 'Zofia', 'Aleksandra', 'Ewa', 'Barbara'],
    },
    {
        culture: 'Romanian', order: 'given-first', cities: ['Brașov'],
        m: ['Andrei', 'Alexandru', 'Mihai', 'Ion', 'Gheorghe', 'Ștefan', 'Radu', 'Cristian', 'Florin', 'Vasile'],
        f: ['Maria', 'Elena', 'Ioana', 'Andreea', 'Ana', 'Mihaela', 'Alexandra', 'Cristina', 'Gabriela', 'Daniela'],
    },
    {
        // Brașov has a large Hungarian community; Hungarians write the family name first.
        culture: 'Hungarian', order: 'family-first', cities: ['Brașov'],
        m: ['László', 'István', 'Zoltán', 'Attila', 'Gábor', 'Csaba', 'Levente', 'Tamás'],
        f: ['Erzsébet', 'Katalin', 'Ildikó', 'Zsuzsanna', 'Éva', 'Enikő', 'Réka', 'Csilla'],
    },
    {
        culture: 'Greek', order: 'given-first', cities: ['Athens'],
        m: ['Georgios', 'Dimitrios', 'Konstantinos', 'Ioannis', 'Nikolaos', 'Panagiotis', 'Christos', 'Vasileios', 'Athanasios', 'Spyros'],
        f: ['Maria', 'Eleni', 'Aikaterini', 'Vasiliki', 'Sofia', 'Georgia', 'Despoina', 'Anastasia', 'Dimitra', 'Panagiota'],
    },
    {
        culture: 'Turkish', order: 'given-first', cities: ['Istanbul'],
        m: ['Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin', 'Emre', 'Burak', 'Murat', 'Hakan', 'Can'],
        f: ['Ayşe', 'Fatma', 'Emine', 'Zeynep', 'Elif', 'Hatice', 'Merve', 'Büşra', 'Esra', 'Selin'],
    },
    {
        culture: 'Russian', order: 'given-first', cities: RUSSIA,
        m: ['Aleksandr', 'Dmitry', 'Sergey', 'Andrey', 'Alexey', 'Ivan', 'Mikhail', 'Nikolai', 'Vladimir', 'Pavel', 'Yuri', 'Oleg'],
        f: ['Elena', 'Olga', 'Tatiana', 'Natalia', 'Irina', 'Svetlana', 'Anna', 'Maria', 'Ekaterina', 'Yulia', 'Lyudmila', 'Galina'],
    },
    {
        culture: 'Egyptian', order: 'given-first', cities: ['Cairo'],
        m: ['Mohamed', 'Ahmed', 'Mahmoud', 'Mostafa', 'Omar', 'Youssef', 'Khaled', 'Karim', 'Amr', 'Hossam'],
        f: ['Fatma', 'Mariam', 'Nour', 'Salma', 'Yasmin', 'Aya', 'Heba', 'Mona', 'Sara', 'Rana'],
    },
    {
        culture: 'Moroccan', order: 'given-first', cities: ['Casablanca'],
        m: ['Mohamed', 'Youssef', 'Hamza', 'Mehdi', 'Amine', 'Rachid', 'Karim', 'Adil', 'Othmane', 'Hicham'],
        f: ['Fatima Zahra', 'Khadija', 'Salma', 'Meryem', 'Imane', 'Hajar', 'Nadia', 'Samira', 'Houda', 'Ghizlane'],
    },
    {
        culture: 'Saudi', order: 'given-first', cities: ['Riyadh'],
        m: ['Abdullah', 'Mohammed', 'Fahad', 'Faisal', 'Khalid', 'Saud', 'Turki', 'Sultan', 'Nasser', 'Bandar'],
        f: ['Nora', 'Sara', 'Reem', 'Lama', 'Haifa', 'Hessa', 'Maha', 'Jawaher', 'Aljouhara', 'Munira'],
    },
    {
        culture: 'Emirati', order: 'given-first', cities: ['Dubai'],
        m: ['Mohammed', 'Rashid', 'Hamdan', 'Saeed', 'Khalifa', 'Sultan', 'Ahmed', 'Majid'],
        f: ['Mariam', 'Fatima', 'Shamma', 'Hessa', 'Maitha', 'Aisha', 'Latifa', 'Alia'],
    },
    {
        culture: 'Persian', order: 'given-first', cities: ['Tehran'],
        m: ['Mohammad', 'Ali', 'Reza', 'Hossein', 'Mehdi', 'Amir', 'Hamid', 'Saeed', 'Babak', 'Dariush'],
        f: ['Fatemeh', 'Zahra', 'Maryam', 'Sara', 'Narges', 'Leila', 'Shirin', 'Parisa', 'Mahsa', 'Niloufar'],
    },
    {
        culture: 'Pakistani', order: 'given-first', cities: ['Karachi', 'Dubai', 'London'],
        m: ['Muhammad Ali', 'Ahmed', 'Usman', 'Bilal', 'Hamza', 'Faisal', 'Imran', 'Zubair', 'Asif', 'Kamran'],
        f: ['Ayesha', 'Fatima', 'Sana', 'Hira', 'Maryam', 'Zainab', 'Amna', 'Rabia', 'Mahnoor', 'Saima'],
    },
    {
        culture: 'North Indian', order: 'given-first', cities: ['Delhi', 'Mumbai', 'Dubai', 'London', 'Toronto', 'Suva'],
        with: ['North Indian', 'Gujarati/Marathi', 'Indo-Fijian'],
        m: ['Rahul', 'Amit', 'Rohit', 'Vikram', 'Arjun', 'Sanjay', 'Anil', 'Rajesh', 'Aditya', 'Karan', 'Suresh', 'Deepak'],
        f: ['Priya', 'Pooja', 'Neha', 'Anjali', 'Sunita', 'Kavita', 'Shreya', 'Divya', 'Ritu', 'Meera', 'Rekha', 'Sneha'],
    },
    {
        culture: 'Bengali', order: 'given-first', cities: ['Kolkata'],
        m: ['Arijit', 'Sourav', 'Debashis', 'Anirban', 'Subhajit', 'Abhishek', 'Partha', 'Sandip', 'Indranil', 'Tapas'],
        f: ['Moumita', 'Sreyashi', 'Tanushree', 'Paromita', 'Riya', 'Ananya', 'Sohini', 'Rituparna', 'Debjani', 'Madhurima'],
    },
    {
        culture: 'Bangladeshi', order: 'given-first', cities: ['Dhaka', 'London'],
        m: ['Mohammad Rafiqul', 'Abdul Karim', 'Tanvir', 'Rakib', 'Shakib', 'Mahmudul', 'Arif', 'Jahid', 'Sabbir', 'Imtiaz'],
        f: ['Nusrat', 'Farzana', 'Sadia', 'Tasnim', 'Sumaiya', 'Nasrin', 'Ruma', 'Shirin', 'Taslima', 'Jannatul'],
    },
    {
        culture: 'Nepali', order: 'given-first', cities: ['Kathmandu'],
        m: ['Bikash', 'Ramesh', 'Suman', 'Prakash', 'Anil', 'Sagar', 'Bishal', 'Rajendra', 'Dipendra', 'Santosh'],
        f: ['Sita', 'Gita', 'Sunita', 'Anjali', 'Pooja', 'Sabina', 'Rojina', 'Srijana', 'Sarita', 'Bimala'],
    },
    {
        culture: 'Thai', order: 'given-first', cities: ['Bangkok'],
        m: ['Somchai', 'Somsak', 'Nattapong', 'Thanakorn', 'Kittisak', 'Prasert', 'Chaiwat', 'Anan', 'Wichai', 'Sompong'],
        f: ['Malee', 'Siriporn', 'Kanya', 'Pornthip', 'Nisa', 'Supaporn', 'Wanida', 'Rattana', 'Kanokwan', 'Nittaya'],
    },
    {
        // Vietnamese names run family, middle, given; the middle name (Văn, Thị, Đức…) is part of the given name here.
        culture: 'Vietnamese', order: 'family-first', cities: ['Hanoi'],
        m: ['Văn Hùng', 'Văn Nam', 'Đức Anh', 'Minh Tuấn', 'Quang Huy', 'Văn Thành', 'Bảo Long', 'Tiến Dũng', 'Đức Thắng', 'Văn Hải'],
        f: ['Thị Lan', 'Thị Hoa', 'Thu Hà', 'Ngọc Anh', 'Thị Mai', 'Thanh Hương', 'Phương Linh', 'Thị Hằng', 'Thị Thu', 'Minh Châu'],
    },
    {
        culture: 'Mandarin', order: 'family-first', cities: MAINLAND_CHINA,
        m: ['Wei', 'Hao', 'Lei', 'Jun', 'Tao', 'Ming', 'Qiang', 'Yong', 'Jie', 'Zhiwei', 'Haoran', 'Jianguo'],
        f: ['Fang', 'Jing', 'Xiuying', 'Na', 'Min', 'Yan', 'Xinyi', 'Yuting', 'Lili', 'Hui', 'Xiaomei', 'Guilan'],
    },
    {
        // Hong Kongers commonly go by an English given name before their surname…
        culture: 'Hong Kong English', order: 'given-first', cities: ['Hong Kong'], with: ['Cantonese'],
        m: ['Kelvin', 'Raymond', 'Eric', 'Alan', 'Vincent', 'Kenneth', 'Terence', 'Calvin', 'Wilson', 'Jacky'],
        f: ['Winnie', 'Cherry', 'Ivy', 'Candy', 'Karen', 'Fiona', 'Gigi', 'Joyce', 'Mandy', 'Queenie'],
    },
    {
        // …or by their Cantonese name, surname first.
        culture: 'Cantonese', order: 'family-first', cities: ['Hong Kong'],
        m: ['Tai-man', 'Ka-ho', 'Chi-keung', 'Siu-ming', 'Wing-kin', 'Chun-wai', 'Kwok-wai', 'Ho-yin'],
        f: ['Ka-yan', 'Wing-sze', 'Mei-ling', 'Suk-yee', 'Hoi-yan', 'Pui-man', 'Wai-ling', 'Siu-fong'],
    },
    {
        culture: 'Singapore English', order: 'given-first', cities: ['Singapore'], with: ['Singapore Chinese'],
        m: ['Jason', 'Kelvin', 'Shawn', 'Darren', 'Bryan', 'Marcus', 'Benjamin', 'Desmond'],
        f: ['Melissa', 'Rachel', 'Cheryl', 'Jasmine', 'Michelle', 'Sharon', 'Germaine', 'Valerie'],
    },
    {
        culture: 'Singapore Chinese', order: 'family-first', cities: ['Singapore'],
        m: ['Wei Ming', 'Jun Jie', 'Kok Wai', 'Zhi Hao', 'Boon Kiat', 'Wei Jie', 'Chee Keong', 'Yong Sheng'],
        f: ['Hui Ling', 'Mei Ling', 'Xin Yi', 'Li Ting', 'Shu Fen', 'Pei Shan', 'Siew Lan', 'Jia Hui'],
    },
    {
        culture: 'Malay', order: 'given-first', cities: ['Singapore'],
        m: ['Muhammad Hafiz', 'Ahmad Faizal', 'Nur Iskandar', 'Mohamed Rizal', 'Muhammad Danial', 'Hairul Anuar'],
        f: ['Nurul Huda', 'Siti Aisyah', 'Nur Aisyah', 'Farhana', 'Nur Syafiqah', 'Siti Nurhaliza'],
    },
    {
        culture: 'Singapore Tamil', order: 'given-first', cities: ['Singapore'],
        m: ['Rajesh', 'Suresh', 'Ganesh', 'Muthu', 'Vijay', 'Arun'],
        f: ['Priya', 'Lakshmi', 'Kavitha', 'Revathi', 'Meena', 'Deepa'],
    },
    {
        culture: 'Indonesian', order: 'given-first', cities: ['Jakarta'],
        m: ['Budi', 'Agus', 'Andi', 'Dedi', 'Rizky', 'Fajar', 'Hendra', 'Bayu', 'Eko', 'Joko'],
        f: ['Siti', 'Dewi', 'Sri', 'Ratna', 'Putri', 'Indah', 'Rina', 'Ayu', 'Wulan', 'Fitri'],
    },
    {
        culture: 'Filipino', order: 'given-first', cities: ['Manila', 'Dubai'],
        m: ['Jose', 'Juan', 'Mark', 'John Paul', 'Jerome', 'Rodrigo', 'Ramon', 'Christian', 'Jericho', 'Paolo'],
        f: ['Maria', 'Angelica', 'Kristine', 'Mary Grace', 'Rowena', 'Lourdes', 'Jasmine', 'Princess', 'Joy', 'Rosalinda'],
    },
    {
        culture: 'Korean', order: 'family-first', cities: ['Seoul'],
        m: ['Min-jun', 'Ji-hoon', 'Hyun-woo', 'Dong-hyun', 'Seo-jun', 'Joon-young', 'Sung-min', 'Jae-won'],
        f: ['Seo-yeon', 'Ji-woo', 'Min-ji', 'Su-bin', 'Ha-eun', 'Yu-na', 'Eun-ji', 'Hye-jin'],
    },
    {
        culture: 'Japanese', order: 'family-first', cities: JAPAN,
        m: ['Hiroshi', 'Takeshi', 'Haruto', 'Yuto', 'Kenji', 'Daiki', 'Sota', 'Ren', 'Kazuki', 'Shota'],
        f: ['Yuki', 'Yui', 'Aoi', 'Sakura', 'Haruka', 'Misaki', 'Keiko', 'Emi', 'Naoko', 'Ayaka'],
    },
    {
        culture: 'Mongolian', order: 'initial-given', cities: ['Ulaanbaatar'],
        m: ['Batbayar', 'Ganbaatar', 'Bat-Erdene', 'Munkh-Erdene', 'Temuulen', 'Enkhbold', 'Sükhbat', 'Tömörbaatar'],
        f: ['Oyunchimeg', 'Enkhjargal', 'Bolormaa', 'Sarnai', 'Tsetseg', 'Nomin', 'Altantsetseg', 'Uranchimeg'],
    },
    {
        culture: 'Afrikaans', order: 'given-first', cities: SOUTH_AFRICA, with: ['Afrikaans', 'English'],
        m: ['Johan', 'Pieter', 'Hendrik', 'Willem', 'Jaco', 'Riaan', 'Gerhard', 'Francois'],
        f: ['Annelie', 'Marelize', 'Elmarie', 'Liesl', 'Anika', 'Riana', 'Charlize', 'Mariska'],
    },
    {
        culture: 'Nguni', order: 'given-first', cities: SOUTH_AFRICA,
        m: ['Sipho', 'Thabo', 'Themba', 'Bongani', 'Lwazi', 'Mandla', 'Siyabonga', 'Lunga'],
        f: ['Nomvula', 'Thandiwe', 'Zanele', 'Lindiwe', 'Nokuthula', 'Ayanda', 'Zodwa', 'Buhle'],
    },
    {
        culture: 'Nigerian', order: 'given-first', cities: ['Lagos'],
        m: ['Oluwaseun', 'Chinedu', 'Emeka', 'Tunde', 'Ifeanyi', 'Babatunde', 'Obinna', 'Segun'],
        f: ['Ngozi', 'Funmilayo', 'Chiamaka', 'Adaeze', 'Folake', 'Yetunde', 'Amaka', 'Temitope'],
    },
    {
        culture: 'Ghanaian', order: 'given-first', cities: ['Accra'],
        m: ['Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwabena', 'Kwesi', 'Kojo', 'Kwadwo'],
        f: ['Ama', 'Akosua', 'Abena', 'Afua', 'Yaa', 'Efua', 'Adwoa', 'Esi'],
    },
    {
        culture: 'Kenyan', order: 'given-first', cities: ['Nairobi'],
        m: ['Baraka', 'Juma', 'Kipkemboi', 'Omondi', 'Kiprono', 'Wekesa', 'Mutiso', 'Kibet'],
        f: ['Wanjiru', 'Akinyi', 'Achieng', 'Wambui', 'Nyambura', 'Chebet', 'Atieno', 'Njeri'],
    },
    {
        // Ethiopians have no family name: the second name is the father's given name.
        culture: 'Ethiopian', order: 'given-first', cities: ['Addis Ababa'],
        m: ['Abebe', 'Dawit', 'Tesfaye', 'Yonas', 'Girma', 'Solomon', 'Bereket', 'Henok'],
        f: ['Meron', 'Selam', 'Tigist', 'Hiwot', 'Bethlehem', 'Mekdes', 'Saba', 'Liya'],
    },
    {
        culture: 'Congolese', order: 'given-first', cities: ['Kinshasa'],
        m: ['Jean-Pierre', 'Patrice', 'Christian', 'Fiston', 'Joseph', 'Héritier', 'Glody', 'Trésor'],
        f: ['Marie-Claire', 'Christelle', 'Grâce', 'Merveille', 'Nadège', 'Ruth', 'Exaucée', 'Divine'],
    },
    {
        culture: 'Malagasy', order: 'given-first', cities: ['Antananarivo'],
        m: ['Hery', 'Rivo', 'Andry', 'Mamy', 'Faly', 'Toky', 'Haja', 'Njaka'],
        f: ['Voahangy', 'Hanta', 'Lalao', 'Noro', 'Fara', 'Haingo', 'Mialy', 'Volana'],
    },
    {
        culture: 'Fijian', order: 'given-first', cities: ['Suva'],
        m: ['Josaia', 'Isikeli', 'Viliame', 'Semi', 'Sakiusa', 'Epeli', 'Jone', 'Waisea'],
        f: ['Mere', 'Litia', 'Seini', 'Losana', 'Salote', 'Asenaca', 'Vasemaca', 'Unaisi'],
    },
];

/* ---------- last names ---------- */
const g = (m, f) => ({ m, f }); // gendered surname

const LAST = [
    {
        culture: 'English', cities: [...NORTH_AMERICA, 'London', 'Edinburgh', 'Dublin', ...OCEANIA_ANGLO, ...SOUTH_AFRICA, 'Dubai'],
        names: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas',
            'White', 'Harris', 'Martin', 'Thompson', 'Clark', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Green', 'Baker', 'Hill'],
    },
    {
        culture: 'Irish', cities: ['Dublin', 'New York', 'Chicago', 'London', 'Sydney', 'Melbourne'],
        names: ['Murphy', 'Kelly', 'O’Sullivan', 'Walsh', 'O’Brien', 'Byrne', 'Ryan', 'O’Connor', 'O’Neill', 'Doyle', 'McCarthy', 'Gallagher'],
    },
    {
        culture: 'Scottish', cities: ['Edinburgh', 'Toronto', 'Vancouver', 'Auckland'],
        names: ['MacDonald', 'Campbell', 'Stewart', 'Robertson', 'Thomson', 'Scott', 'Murray', 'MacLeod', 'Fraser', 'Reid', 'Ross', 'Morrison'],
    },
    { culture: 'Hawaiian', cities: ['Honolulu'], names: ['Kealoha', 'Akana', 'Kahananui', 'Kamakana', 'Kanoho', 'Kalua', 'Keawe', 'Mahoe'] },
    { culture: 'Māori', cities: ['Auckland'], names: ['Ngata', 'Parata', 'Tipene', 'Te Rangi', 'Tamihana', 'Henare', 'Paewai', 'Karaka', 'Hohaia', 'Te Whata'] },
    {
        culture: 'French', cities: ['Paris'],
        names: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent'],
    },
    {
        culture: 'French Canadian', cities: ['Montreal'],
        names: ['Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné', 'Ouellet', 'Pelletier'],
    },
    {
        culture: 'Spanish', cities: LATAM_TWO_SURNAMES, count: 2,
        names: ['García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz',
            'Hernández', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Morales', 'Castillo', 'Vargas', 'Rojas', 'Muñoz'],
    },
    {
        culture: 'Spanish (one surname)', cities: [...US_HISPANIC, 'Buenos Aires'],
        names: ['García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz',
            'Hernández', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Morales', 'Castillo', 'Romero', 'Álvarez', 'Ruiz'],
    },
    {
        culture: 'Portuguese', cities: LUSOPHONE, count: 2,
        names: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
            'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Sousa', 'Fernandes', 'Barbosa', 'Rocha'],
    },
    {
        culture: 'Italian', cities: ['Rome', 'Buenos Aires'],
        names: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo'],
    },
    {
        culture: 'German', cities: ['Berlin'],
        names: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter'],
    },
    {
        culture: 'Dutch', cities: ['Amsterdam'],
        names: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos'],
    },
    {
        culture: 'Swedish', cities: ['Stockholm'],
        names: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Lindberg', 'Lindqvist'],
    },
    {
        culture: 'Norwegian', cities: ['Oslo'],
        names: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Berg', 'Haugen', 'Hagen', 'Bakken'],
    },
    {
        // Icelanders use patronymics: the father's name + -son (son) or -dóttir (daughter).
        culture: 'Icelandic', cities: ['Reykjavík'],
        names: [g('Jónsson', 'Jónsdóttir'), g('Sigurðsson', 'Sigurðardóttir'), g('Guðmundsson', 'Guðmundsdóttir'), g('Gunnarsson', 'Gunnarsdóttir'),
            g('Ólafsson', 'Ólafsdóttir'), g('Einarsson', 'Einarsdóttir'), g('Kristjánsson', 'Kristjánsdóttir'), g('Magnússon', 'Magnúsdóttir'),
            g('Stefánsson', 'Stefánsdóttir'), g('Helgason', 'Helgadóttir')],
    },
    {
        culture: 'Czech', cities: ['Prague'],
        names: [g('Novák', 'Nováková'), g('Svoboda', 'Svobodová'), g('Novotný', 'Novotná'), g('Dvořák', 'Dvořáková'), g('Černý', 'Černá'),
            g('Procházka', 'Procházková'), g('Kučera', 'Kučerová'), g('Veselý', 'Veselá'), g('Horák', 'Horáková'), g('Němec', 'Němcová')],
    },
    {
        culture: 'Polish', cities: ['Warsaw'],
        names: ['Nowak', g('Kowalski', 'Kowalska'), g('Wiśniewski', 'Wiśniewska'), 'Wójcik', 'Kowalczyk', g('Kamiński', 'Kamińska'),
            g('Lewandowski', 'Lewandowska'), g('Zieliński', 'Zielińska'), g('Szymański', 'Szymańska'), 'Woźniak', g('Dąbrowski', 'Dąbrowska')],
    },
    {
        culture: 'Romanian', cities: ['Brașov'],
        names: ['Popescu', 'Ionescu', 'Popa', 'Pop', 'Radu', 'Dumitru', 'Stan', 'Stoica', 'Gheorghe', 'Munteanu', 'Constantin', 'Matei'],
    },
    { culture: 'Hungarian', cities: ['Brașov'], names: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Farkas', 'Balogh'] },
    {
        culture: 'Greek', cities: ['Athens'],
        names: [g('Papadopoulos', 'Papadopoulou'), 'Georgiou', g('Nikolaidis', 'Nikolaidou'), g('Papadakis', 'Papadaki'), 'Oikonomou',
            g('Vlachos', 'Vlachou'), g('Pappas', 'Pappa'), g('Karagiannis', 'Karagianni'), g('Makris', 'Makri'), 'Dimitriou'],
    },
    {
        culture: 'Turkish', cities: ['Istanbul'],
        names: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan'],
    },
    {
        culture: 'Russian', cities: RUSSIA,
        names: [g('Ivanov', 'Ivanova'), g('Smirnov', 'Smirnova'), g('Kuznetsov', 'Kuznetsova'), g('Popov', 'Popova'), g('Vasiliev', 'Vasilieva'),
            g('Petrov', 'Petrova'), g('Sokolov', 'Sokolova'), g('Mikhailov', 'Mikhailova'), g('Novikov', 'Novikova'), g('Fedorov', 'Fedorova'),
            g('Morozov', 'Morozova'), g('Volkov', 'Volkova')],
    },
    {
        // In Egypt the second name is usually the father's name.
        culture: 'Egyptian', cities: ['Cairo'],
        names: ['Hassan', 'Mahmoud', 'Ibrahim', 'El-Sayed', 'Abdel Rahman', 'Mostafa', 'Saleh', 'Farouk', 'Fathy', 'Gamal', 'Ali', 'Mansour'],
    },
    {
        culture: 'Moroccan', cities: ['Casablanca'],
        names: ['El Amrani', 'Benali', 'Alaoui', 'Bennani', 'Tazi', 'El Idrissi', 'Berrada', 'Chraibi', 'Lahlou', 'El Fassi', 'Ouazzani', 'Bouzid'],
    },
    {
        culture: 'Saudi', cities: ['Riyadh'],
        names: ['Al-Qahtani', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Dosari', 'Al-Harbi', 'Al-Zahrani', 'Al-Shehri', 'Al-Mutairi', 'Al-Shammari', 'Al-Subaie'],
    },
    {
        culture: 'Emirati', cities: ['Dubai'],
        names: ['Al Mansoori', 'Al Falasi', 'Al Nuaimi', 'Al Shamsi', 'Al Suwaidi', 'Al Muhairi', 'Al Ketbi', 'Al Mazrouei', 'Al Hammadi', 'Al Marri'],
    },
    {
        culture: 'Persian', cities: ['Tehran'],
        names: ['Mohammadi', 'Hosseini', 'Ahmadi', 'Rezaei', 'Karimi', 'Moradi', 'Hashemi', 'Jafari', 'Rahimi', 'Sadeghi', 'Ghasemi', 'Kazemi'],
    },
    {
        culture: 'Pakistani', cities: ['Karachi', 'Dubai', 'London'],
        names: ['Khan', 'Ahmed', 'Siddiqui', 'Qureshi', 'Shaikh', 'Memon', 'Malik', 'Chaudhry', 'Butt', 'Raza', 'Hussain', 'Baig'],
    },
    {
        culture: 'North Indian', cities: ['Delhi', 'Mumbai', 'Dubai', 'London', 'Toronto'],
        names: ['Sharma', 'Gupta', 'Verma', 'Singh', 'Agarwal', 'Malhotra', 'Kapoor', 'Mehra', 'Chopra', 'Saxena', 'Joshi', 'Bhatia'],
    },
    {
        culture: 'Gujarati/Marathi', cities: ['Mumbai', 'London', 'Toronto', 'Dubai'],
        names: ['Patel', 'Shah', 'Mehta', 'Desai', 'Patil', 'Deshmukh', 'Kulkarni', 'Pawar', 'Shinde', 'Jadhav'],
    },
    { culture: 'Indo-Fijian', cities: ['Suva'], names: ['Prasad', 'Kumar', 'Chand', 'Naidu', 'Singh', 'Lal', 'Narayan', 'Sharma', 'Reddy', 'Ram'] },
    {
        culture: 'Bengali', cities: ['Kolkata'],
        names: ['Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Bose', 'Ghosh', 'Sen', 'Dutta', 'Roy', 'Chakraborty', 'Bhattacharya', 'Mitra'],
    },
    {
        // Akter and Begum are used by women only.
        culture: 'Bangladeshi', cities: ['Dhaka', 'London'],
        names: ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Alam', 'Miah', 'Sarkar', g('Uddin', null), g(null, 'Akter'), g(null, 'Begum')],
    },
    {
        culture: 'Nepali', cities: ['Kathmandu'],
        names: ['Shrestha', 'Thapa', 'Gurung', 'Tamang', 'Rai', 'Adhikari', 'Karki', 'Maharjan', 'Magar', 'Bhandari', 'Poudel', 'Sharma'],
    },
    {
        culture: 'Thai', cities: ['Bangkok'],
        names: ['Saetang', 'Srisuk', 'Wongsawat', 'Charoenpong', 'Suksawat', 'Boonmee', 'Jaidee', 'Thongdee', 'Rattanakul', 'Chaiyaporn', 'Kaewmanee', 'Phromsuk'],
    },
    {
        culture: 'Vietnamese', cities: ['Hanoi'],
        names: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'],
    },
    {
        culture: 'Mandarin', cities: MAINLAND_CHINA,
        names: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo'],
    },
    {
        culture: 'Cantonese', cities: ['Hong Kong', 'Vancouver', 'Toronto', 'New York', 'Sydney'],
        names: ['Chan', 'Wong', 'Lee', 'Cheung', 'Lau', 'Ng', 'Leung', 'Ho', 'Yip', 'Tsang', 'Lam', 'Chow'],
    },
    {
        culture: 'Singapore Chinese', cities: ['Singapore'],
        names: ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Chan', 'Koh', 'Teo', 'Ang'],
    },
    {
        // Malay names have no surname: "binti"/"bin" (daughter/son of) and the father's name.
        culture: 'Malay', cities: ['Singapore'], connector: { m: 'bin', f: 'binti' },
        names: ['Ahmad', 'Ismail', 'Hassan', 'Yusof', 'Rahman', 'Osman', 'Abdullah', 'Salleh', 'Hamid', 'Ibrahim'],
    },
    {
        // Singapore Tamils often have no surname: "s/o" or "d/o" (son/daughter of) and the father's name.
        culture: 'Singapore Tamil', cities: ['Singapore'], connector: { m: 's/o', f: 'd/o' },
        names: ['Krishnan', 'Raman', 'Subramaniam', 'Govindasamy', 'Arumugam', 'Murugan', 'Selvaraj', 'Rajendran'],
    },
    { culture: 'Indonesian', cities: ['Jakarta'], names: ['Santoso', 'Wijaya', 'Hidayat', 'Setiawan', 'Kurniawan', 'Nugroho', 'Susanto', 'Gunawan', g('Saputra', null), g('Pratama', null), g(null, 'Lestari'), g(null, 'Rahayu')] },
    {
        culture: 'Filipino', cities: ['Manila', 'Dubai'],
        names: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Dela Cruz', 'Villanueva', 'Ramos', 'Aquino', 'Castillo', 'Del Rosario'],
    },
    {
        culture: 'Korean', cities: ['Seoul', 'Los Angeles', 'New York'],
        names: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Shin'],
    },
    {
        culture: 'Japanese', cities: [...JAPAN, 'Honolulu', 'São Paulo'],
        names: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada'],
    },
    {
        // Mongolians use the father's given name as a patronymic, usually shortened to an initial.
        culture: 'Mongolian', cities: ['Ulaanbaatar'],
        names: ['Gantulga', 'Dorj', 'Batsaikhan', 'Altangerel', 'Tsogt', 'Purev', 'Damdin', 'Baatar', 'Erdene', 'Ganzorig'],
    },
    {
        culture: 'Afrikaans', cities: SOUTH_AFRICA,
        names: ['van der Merwe', 'Botha', 'Pretorius', 'du Plessis', 'van Wyk', 'Nel', 'Venter', 'Steyn', 'Joubert', 'Coetzee'],
    },
    {
        culture: 'Nguni', cities: SOUTH_AFRICA,
        names: ['Dlamini', 'Nkosi', 'Ndlovu', 'Khumalo', 'Zulu', 'Mthembu', 'Ngcobo', 'Mahlangu', 'Mabaso', 'Ntuli'],
    },
    {
        culture: 'Nigerian', cities: ['Lagos'],
        names: ['Okafor', 'Adeyemi', 'Okonkwo', 'Balogun', 'Adebayo', 'Eze', 'Nwosu', 'Oladipo', 'Ogunleye', 'Chukwu', 'Afolabi', 'Obi'],
    },
    {
        culture: 'Ghanaian', cities: ['Accra'],
        names: ['Mensah', 'Owusu', 'Asante', 'Boateng', 'Osei', 'Appiah', 'Agyeman', 'Addo', 'Darko', 'Ofori', 'Amoah', 'Quaye'],
    },
    {
        culture: 'Kenyan', cities: ['Nairobi'],
        names: ['Kamau', 'Mwangi', 'Otieno', 'Odhiambo', 'Kariuki', 'Njoroge', 'Ochieng', 'Kiprotich', 'Wanjala', 'Mutua', 'Kimani', 'Onyango'],
    },
    {
        culture: 'Ethiopian', cities: ['Addis Ababa'],
        names: ['Bekele', 'Haile', 'Tadesse', 'Alemu', 'Girma', 'Mengistu', 'Tesfaye', 'Kebede', 'Abebe', 'Wolde', 'Desta', 'Assefa'],
    },
    {
        culture: 'Congolese', cities: ['Kinshasa'],
        names: ['Mbuyi', 'Tshibangu', 'Kalala', 'Mukendi', 'Ilunga', 'Kabongo', 'Lukusa', 'Mbala', 'Nzuzi', 'Makiese'],
    },
    {
        culture: 'Malagasy', cities: ['Antananarivo'],
        names: ['Rakotomalala', 'Randrianarisoa', 'Rasoanaivo', 'Rakotondrabe', 'Razafindrakoto', 'Andrianasolo', 'Rabemananjara', 'Ratsimbazafy', 'Rakotoarisoa', 'Randriamanantena'],
    },
    {
        culture: 'Fijian', cities: ['Suva'],
        names: ['Waqa', 'Nadolo', 'Tuivaga', 'Koroi', 'Vuniwaqa', 'Ravuvu', 'Naivalu', 'Qio', 'Tikoduadua', 'Raikadroka'],
    },
];

/* ---------- flattened: one entry per name, each with its own list of cities ---------- */

/** [{ name, gender: 'm'|'f', culture, order, with, cities }] */
export const FIRST_NAMES = FIRST.flatMap((grp) =>
    ['m', 'f'].flatMap((gender) =>
        grp[gender].map((name) => ({
            name,
            gender,
            culture: grp.culture,
            order: grp.order,
            with: grp.with ?? [grp.culture],
            cities: grp.cities,
        })),
    ),
);

/** [{ name: string | { m, f }, culture, cities, count?, connector? }] */
export const LAST_NAMES = LAST.flatMap((grp) =>
    grp.names.map((name) => ({
        name,
        culture: grp.culture,
        cities: grp.cities,
        ...(grp.count ? { count: grp.count } : {}),
        ...(grp.connector ? { connector: grp.connector } : {}),
    })),
);

/** The form of a last name for a gender, or null if it isn't used for that gender. */
export function lastNameFor(entry, gender) {
    return typeof entry.name === 'string' ? entry.name : entry.name[gender] ?? null;
}

/** Puts a full name together the way people in that culture write it. */
export function formatName(first, lastParts, entry) {
    const family = lastParts.join(' ');
    if (entry.connector) return `${first.name} ${entry.connector[first.gender]} ${family}`;
    if (first.order === 'family-first') return `${family} ${first.name}`;
    if (first.order === 'initial-given') return `${family[0]}. ${first.name}`;
    return `${first.name} ${family}`;
}