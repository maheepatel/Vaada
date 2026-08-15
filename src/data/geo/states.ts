/**
 * India: states / union territories and their districts.
 *
 * PROVENANCE — read before trusting this.
 * This is a working snapshot, hand-maintained so the location picker works with
 * no network and no configuration. District boundaries in India change often
 * (Rajasthan alone was reorganised in 2023 and again in 2024), so treat this as
 * a convenience list, not an authority. `scripts/import-geo.ts` replaces it
 * wholesale from the Local Government Directory, which is the authority.
 *
 * The picker never blocks on this list: any name can be typed in free-hand. The
 * list exists to make the common case fast and to keep spellings consistent, so
 * that "Alwar" and "Alwaar" do not become two districts in the register.
 */

export interface StateGeo {
  name: string;
  slug: string;
  /** ISO 3166-2:IN code, useful when reconciling with external datasets. */
  code: string;
  type: 'state' | 'ut';
  districts: string[];
}

export const STATES: StateGeo[] = [
  {
    name: 'Andhra Pradesh',
    slug: 'andhra-pradesh',
    code: 'AP',
    type: 'state',
    districts: [
      'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
      'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
      'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu',
      'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore',
      'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram',
      'West Godavari', 'YSR Kadapa',
    ],
  },
  {
    name: 'Arunachal Pradesh',
    slug: 'arunachal-pradesh',
    code: 'AR',
    type: 'state',
    districts: [
      'Anjaw', 'Bichom', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
      'Kamle', 'Keyi Panyor', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit',
      'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri',
      'Namsai', 'Pakke-Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang',
      'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang',
    ],
  },
  {
    name: 'Assam',
    slug: 'assam',
    code: 'AS',
    type: 'state',
    districts: [
      'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
      'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh',
      'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat',
      'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar',
      'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar',
      'Sonitpur', 'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri',
      'West Karbi Anglong',
    ],
  },
  {
    name: 'Bihar',
    slug: 'bihar',
    code: 'BR',
    type: 'state',
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur',
      'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj',
      'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj',
      'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda',
      'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran',
      'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali',
      'West Champaran',
    ],
  },
  {
    name: 'Chhattisgarh',
    slug: 'chhattisgarh',
    code: 'CG',
    type: 'state',
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur',
      'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband',
      'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
      'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba',
      'Koriya', 'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur',
      'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh',
      'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma',
      'Surajpur', 'Surguja',
    ],
  },
  {
    name: 'Goa',
    slug: 'goa',
    code: 'GA',
    type: 'state',
    districts: ['North Goa', 'South Goa'],
  },
  {
    name: 'Gujarat',
    slug: 'gujarat',
    code: 'GJ',
    type: 'state',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
      'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhumi Dwarka',
      'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
      'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
      'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
      'Tapi', 'Vadodara', 'Valsad',
    ],
  },
  {
    name: 'Haryana',
    slug: 'haryana',
    code: 'HR',
    type: 'state',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
      'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh',
      'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
      'Sonipat', 'Yamunanagar',
    ],
  },
  {
    name: 'Himachal Pradesh',
    slug: 'himachal-pradesh',
    code: 'HP',
    type: 'state',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
      'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
    ],
  },
  {
    name: 'Jharkhand',
    slug: 'jharkhand',
    code: 'JH',
    type: 'state',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum',
      'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti',
      'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
      'Sahibganj', 'Seraikela-Kharsawan', 'Simdega', 'West Singhbhum',
    ],
  },
  {
    name: 'Karnataka',
    slug: 'karnataka',
    code: 'KA',
    type: 'state',
    districts: [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
      'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur',
      'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
      'Vijayanagara', 'Vijayapura', 'Yadgir',
    ],
  },
  {
    name: 'Kerala',
    slug: 'kerala',
    code: 'KL',
    type: 'state',
    districts: [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
      'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
      'Thiruvananthapuram', 'Thrissur', 'Wayanad',
    ],
  },
  {
    name: 'Madhya Pradesh',
    slug: 'madhya-pradesh',
    code: 'MP',
    type: 'state',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
      'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
      'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
      'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Maihar',
      'Mandla', 'Mandsaur', 'Morena', 'Narmadapuram', 'Narsinghpur', 'Neemuch',
      'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa',
      'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur',
      'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria',
      'Vidisha',
    ],
  },
  {
    name: 'Maharashtra',
    slug: 'maharashtra',
    code: 'MH',
    type: 'state',
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana',
      'Chandrapur', 'Chhatrapati Sambhajinagar', 'Dharashiv', 'Dhule', 'Gadchiroli',
      'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City',
      'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Palghar',
      'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg',
      'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
    ],
  },
  {
    name: 'Manipur',
    slug: 'manipur',
    code: 'MN',
    type: 'state',
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
      'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl',
      'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
    ],
  },
  {
    name: 'Meghalaya',
    slug: 'meghalaya',
    code: 'ML',
    type: 'state',
    districts: [
      'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills',
      'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills',
      'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills',
      'West Khasi Hills',
    ],
  },
  {
    name: 'Mizoram',
    slug: 'mizoram',
    code: 'MZ',
    type: 'state',
    districts: [
      'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai',
      'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip',
    ],
  },
  {
    name: 'Nagaland',
    slug: 'nagaland',
    code: 'NL',
    type: 'state',
    districts: [
      'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung',
      'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu',
      'Tuensang', 'Wokha', 'Zunheboto',
    ],
  },
  {
    name: 'Odisha',
    slug: 'odisha',
    code: 'OD',
    type: 'state',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack',
      'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
      'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
      'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
      'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh',
    ],
  },
  {
    name: 'Punjab',
    slug: 'punjab',
    code: 'PB',
    type: 'state',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
      'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
      'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala',
      'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur',
      'Shahid Bhagat Singh Nagar', 'Tarn Taran',
    ],
  },
  {
    name: 'Rajasthan',
    slug: 'rajasthan',
    code: 'RJ',
    type: 'state',
    districts: [
      'Ajmer', 'Alwar', 'Balotra', 'Banswara', 'Baran', 'Barmer', 'Beawar',
      'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu',
      'Dausa', 'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dungarpur', 'Ganganagar',
      'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu',
      'Jodhpur', 'Karauli', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror',
      'Nagaur', 'Pali', 'Phalodi', 'Pratapgarh', 'Rajsamand', 'Salumbar',
      'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur',
    ],
  },
  {
    name: 'Sikkim',
    slug: 'sikkim',
    code: 'SK',
    type: 'state',
    districts: ['Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'],
  },
  {
    name: 'Tamil Nadu',
    slug: 'tamil-nadu',
    code: 'TN',
    type: 'state',
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
      'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
      'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
      'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
      'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur',
      'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur',
      'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
      'Viluppuram', 'Virudhunagar',
    ],
  },
  {
    name: 'Telangana',
    slug: 'telangana',
    code: 'TG',
    type: 'state',
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad',
      'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal',
      'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad',
      'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri',
      'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad',
      'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet',
      'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri',
    ],
  },
  {
    name: 'Tripura',
    slug: 'tripura',
    code: 'TR',
    type: 'state',
    districts: [
      'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura',
      'Unakoti', 'West Tripura',
    ],
  },
  {
    name: 'Uttar Pradesh',
    slug: 'uttar-pradesh',
    code: 'UP',
    type: 'state',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya',
      'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur',
      'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun',
      'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
      'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
      'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras',
      'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar',
      'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow',
      'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur',
      'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj',
      'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
      'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
      'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi',
    ],
  },
  {
    name: 'Uttarakhand',
    slug: 'uttarakhand',
    code: 'UK',
    type: 'state',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
      'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
      'Udham Singh Nagar', 'Uttarkashi',
    ],
  },
  {
    name: 'West Bengal',
    slug: 'west-bengal',
    code: 'WB',
    type: 'state',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
      'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
      'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
      'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman',
      'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
    ],
  },

  // ---- Union territories ----
  {
    name: 'Andaman and Nicobar Islands',
    slug: 'andaman-and-nicobar-islands',
    code: 'AN',
    type: 'ut',
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  },
  {
    name: 'Chandigarh',
    slug: 'chandigarh',
    code: 'CH',
    type: 'ut',
    districts: ['Chandigarh'],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    slug: 'dadra-and-nagar-haveli-and-daman-and-diu',
    code: 'DH',
    type: 'ut',
    districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  },
  {
    name: 'Delhi',
    slug: 'delhi',
    code: 'DL',
    type: 'ut',
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
      'South West Delhi', 'West Delhi',
    ],
  },
  {
    name: 'Jammu and Kashmir',
    slug: 'jammu-and-kashmir',
    code: 'JK',
    type: 'ut',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal',
      'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
      'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur',
    ],
  },
  {
    name: 'Ladakh',
    slug: 'ladakh',
    code: 'LA',
    type: 'ut',
    districts: ['Kargil', 'Leh'],
  },
  {
    name: 'Lakshadweep',
    slug: 'lakshadweep',
    code: 'LD',
    type: 'ut',
    districts: ['Lakshadweep'],
  },
  {
    name: 'Puducherry',
    slug: 'puducherry',
    code: 'PY',
    type: 'ut',
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  },
];

/**
 * Sub-districts (tehsil / taluk / block) keyed `stateSlug:districtSlug`.
 *
 * There are roughly 7,000 of these nationally and this file carries only the
 * ones the register actually touches. The picker falls back to free text for
 * everything else and says so, rather than pretending the list is complete.
 * Run `scripts/import-geo.ts --level=subdistrict` to fill it from LGD.
 */
export const SUBDISTRICTS: Record<string, string[]> = {
  'rajasthan:alwar': [
    'Alwar', 'Bansur', 'Behror', 'Kathumar', 'Kishangarh Bas', 'Lachhmangarh',
    'Malakhera', 'Mundawar', 'Rajgarh', 'Ramgarh', 'Reni', 'Thanagazi', 'Tijara',
  ],
  'rajasthan:barmer': [
    'Baytu', 'Chohtan', 'Dhorimanna', 'Gudamalani', 'Ramsar', 'Sedwa',
    'Sheo', 'Siwana', 'Barmer',
  ],
  'rajasthan:jalore': [
    'Ahore', 'Bhinmal', 'Chitalwana', 'Jalore', 'Jaswantpura', 'Raniwara',
    'Sanchore', 'Sayla',
  ],
  'rajasthan:jaipur': [
    'Amber', 'Bassi', 'Chaksu', 'Chomu', 'Dudu', 'Jaipur', 'Jamwa Ramgarh',
    'Jhotwara', 'Kotputli', 'Phagi', 'Sambhar', 'Sanganer', 'Shahpura', 'Viratnagar',
  ],
  'uttar-pradesh:fatehpur': [
    'Bindki', 'Fatehpur', 'Khaga',
  ],
  'uttar-pradesh:pilibhit': [
    'Bisalpur', 'Puranpur', 'Pilibhit', 'Amaria', 'Kalinagar',
  ],
  'bihar:gaya': [
    'Bodh Gaya', 'Gaya Sadar', 'Imamganj', 'Neemchak Bathani', 'Sherghati',
    'Tekari', 'Wazirganj',
  ],
  'madhya-pradesh:chhindwara': [
    'Amarwara', 'Chaurai', 'Chhindwara', 'Harrai', 'Junnardeo', 'Parasia',
    'Sausar', 'Tamia',
  ],
  'maharashtra:palghar': [
    'Dahanu', 'Jawhar', 'Mokhada', 'Palghar', 'Talasari', 'Vasai', 'Vikramgad',
    'Wada',
  ],
  'maharashtra:beed': [
    'Ambajogai', 'Ashti', 'Beed', 'Dharur', 'Georai', 'Kaij', 'Majalgaon',
    'Parli', 'Patoda', 'Shirur Kasar', 'Wadwani',
  ],
  'maharashtra:dharashiv': [
    'Bhum', 'Dharashiv', 'Kalamb', 'Lohara', 'Paranda', 'Tuljapur', 'Umarga',
    'Washi',
  ],
  'jharkhand:ranchi': [
    'Angara', 'Bundu', 'Burmu', 'Chanho', 'Itki', 'Kanke', 'Khelari', 'Lapung',
    'Mandar', 'Namkum', 'Ormanjhi', 'Rahe', 'Ranchi', 'Silli', 'Sonahatu',
    'Tamar',
  ],
};

/**
 * Villages keyed `stateSlug:districtSlug:subdistrictSlug`.
 *
 * India has roughly 640,000 villages. Embedding them is not an option, so this
 * carries only what the register uses; everything else is typed in. The picker
 * treats an unknown village as perfectly normal.
 */
export const VILLAGES: Record<string, string[]> = {
  'rajasthan:alwar:thanagazi': [
    'Jodhawas', 'Thanagazi', 'Ajabgarh', 'Bhangarh', 'Devri', 'Ghata',
    'Kushalgarh', 'Pratapgarh', 'Raisees',
  ],
  'rajasthan:barmer:baytu': ['Bankalpura', 'Baytu', 'Kavas', 'Solankiyon Ki Dhani'],
  'rajasthan:jalore:sayla': ['Mengalwa', 'Sayla', 'Bagra', 'Tilode'],
  'uttar-pradesh:fatehpur:bindki': ['Kishanpur', 'Bindki', 'Malwan'],
  'bihar:gaya:tekari': ['Simuara', 'Tekari', 'Konch'],
  'madhya-pradesh:chhindwara:tamia': ['Tamia', 'Delakhari', 'Jamai'],
  'maharashtra:palghar:dahanu': ['Dahanu', 'Bordi', 'Chinchani', 'Ganjad'],
};

/**
 * Schools, keyed the same way as villages plus the village slug.
 *
 * UDISE+ lists roughly 1.5 million schools; this carries the handful in the
 * register so that repeat submissions about the same school do not fragment
 * into four spellings. `udise` is the national school code — the single most
 * useful thing a submitter can give us, because it makes the row joinable to
 * official enrolment and infrastructure data.
 */
export interface SchoolGeo {
  name: string;
  udise?: string;
}

export const SCHOOLS: Record<string, SchoolGeo[]> = {
  'rajasthan:alwar:thanagazi:jodhawas': [
    { name: 'Government Senior Secondary School, Jodhawas' },
  ],
  'rajasthan:barmer:baytu:solankiyon-ki-dhani': [
    { name: 'Government Senior Secondary School, Solankiyon Ki Dhani Bankalpura' },
  ],
  'rajasthan:jalore:sayla:mengalwa': [
    { name: 'Government School, Mengalwa' },
  ],
  'uttar-pradesh:fatehpur:bindki:kishanpur': [
    { name: 'Sarvodaya Inter College, Kishanpur' },
  ],
  'bihar:gaya:tekari:simuara': [
    { name: 'Simuara Middle School' },
  ],
  'madhya-pradesh:chhindwara:tamia:tamia': [
    { name: 'Eklavya Adarsh Aawasiya Vidyalaya, Tamia' },
  ],
  'maharashtra:palghar:dahanu:dahanu': [
    { name: 'Zilla Parishad School, Dahanu' },
  ],
};
