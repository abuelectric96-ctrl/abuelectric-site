// Viloyatlar, tumanlar va xizmat turlari — butun sayt shu ro'yxatdan foydalanadi.

export const REGIONS = [
  { slug: 'qoraqalpogiston', name: "Qoraqalpog'iston Respublikasi", short: "Qoraqalpog'iston", districts: [
    'Nukus shahri', 'Amudaryo tumani', 'Beruniy tumani', "Bo'zatov tumani", 'Chimboy tumani', "Ellikqal'a tumani",
    'Kegeyli tumani', "Mo'ynoq tumani", 'Nukus tumani', "Qanliko'l tumani", "Qo'ng'irot tumani", "Qorao'zak tumani",
    'Shumanay tumani', "Taxiatosh tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani"] },
  { slug: 'andijon', name: 'Andijon viloyati', short: 'Andijon', districts: [
    'Andijon shahri', 'Xonobod shahri', 'Andijon tumani', 'Asaka tumani', 'Baliqchi tumani', "Bo'ston tumani",
    'Buloqboshi tumani', 'Izboskan tumani', 'Jalaquduq tumani', "Xo'jaobod tumani", "Qo'rg'ontepa tumani",
    'Marhamat tumani', "Oltinko'l tumani", 'Paxtaobod tumani', 'Shahrixon tumani', "Ulug'nor tumani"] },
  { slug: 'buxoro', name: 'Buxoro viloyati', short: 'Buxoro', districts: [
    'Buxoro shahri', 'Kogon shahri', 'Buxoro tumani', 'Vobkent tumani', "G'ijduvon tumani", 'Jondor tumani',
    'Kogon tumani', 'Olot tumani', 'Peshku tumani', "Qorako'l tumani", 'Qorovulbozor tumani', 'Romitan tumani',
    'Shofirkon tumani'] },
  { slug: 'fargona', name: "Farg'ona viloyati", short: "Farg'ona", districts: [
    "Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", 'Quvasoy shahri', 'Beshariq tumani', "Bag'dod tumani",
    'Buvayda tumani', "Dang'ara tumani", "Farg'ona tumani", 'Furqat tumani', "Qo'shtepa tumani", 'Quva tumani',
    'Rishton tumani', "So'x tumani", 'Toshloq tumani', "Uchko'prik tumani", "O'zbekiston tumani", 'Oltiariq tumani',
    'Yozyovon tumani'] },
  { slug: 'jizzax', name: 'Jizzax viloyati', short: 'Jizzax', districts: [
    'Jizzax shahri', 'Arnasoy tumani', 'Baxmal tumani', "Do'stlik tumani", 'Forish tumani', "G'allaorol tumani",
    'Sharof Rashidov tumani', "Mirzacho'l tumani", 'Paxtakor tumani', 'Yangiobod tumani', 'Zomin tumani',
    'Zafarobod tumani', 'Zarbdor tumani'] },
  { slug: 'xorazm', name: 'Xorazm viloyati', short: 'Xorazm', districts: [
    'Urganch shahri', 'Xiva shahri', "Bog'ot tumani", 'Gurlan tumani', 'Xonqa tumani', 'Hazorasp tumani',
    'Xiva tumani', "Qo'shko'pir tumani", 'Shovot tumani', 'Urganch tumani', 'Yangiariq tumani', 'Yangibozor tumani',
    "Tuproqqal'a tumani"] },
  { slug: 'namangan', name: 'Namangan viloyati', short: 'Namangan', districts: [
    'Namangan shahri', 'Chortoq tumani', 'Chust tumani', 'Davlatobod tumani', 'Kosonsoy tumani', 'Mingbuloq tumani',
    'Namangan tumani', 'Norin tumani', 'Pop tumani', "To'raqo'rg'on tumani", "Uchqo'rg'on tumani", 'Uychi tumani',
    "Yangiqo'rg'on tumani", 'Yangi Namangan tumani'] },
  { slug: 'navoiy', name: 'Navoiy viloyati', short: 'Navoiy', districts: [
    'Navoiy shahri', 'Zarafshon shahri', "G'ozg'on shahri", 'Karmana tumani', 'Konimex tumani', 'Navbahor tumani',
    'Nurota tumani', 'Qiziltepa tumani', 'Tomdi tumani', 'Uchquduq tumani', 'Xatirchi tumani'] },
  { slug: 'qashqadaryo', name: 'Qashqadaryo viloyati', short: 'Qashqadaryo', districts: [
    'Qarshi shahri', 'Shahrisabz shahri', 'Chiroqchi tumani', 'Dehqonobod tumani', "G'uzor tumani", 'Kasbi tumani',
    'Kitob tumani', 'Koson tumani', "Ko'kdala tumani", 'Mirishkor tumani', 'Muborak tumani', 'Nishon tumani',
    'Qamashi tumani', 'Qarshi tumani', 'Shahrisabz tumani', "Yakkabog' tumani"] },
  { slug: 'samarqand', name: 'Samarqand viloyati', short: 'Samarqand', districts: [
    'Samarqand shahri', "Kattaqo'rg'on shahri", "Bulung'ur tumani", 'Ishtixon tumani', 'Jomboy tumani',
    "Kattaqo'rg'on tumani", "Qo'shrabot tumani", 'Narpay tumani', 'Nurobod tumani', 'Oqdaryo tumani',
    'Paxtachi tumani', "Pastdarg'om tumani", 'Payariq tumani', 'Samarqand tumani', 'Toyloq tumani', 'Urgut tumani'] },
  { slug: 'sirdaryo', name: 'Sirdaryo viloyati', short: 'Sirdaryo', districts: [
    'Guliston shahri', 'Yangiyer shahri', 'Shirin shahri', 'Boyovut tumani', 'Guliston tumani', 'Mirzaobod tumani',
    'Oqoltin tumani', 'Sardoba tumani', 'Sayxunobod tumani', 'Sirdaryo tumani', 'Xovos tumani'] },
  { slug: 'surxondaryo', name: 'Surxondaryo viloyati', short: 'Surxondaryo', districts: [
    'Termiz shahri', 'Angor tumani', 'Bandixon tumani', 'Boysun tumani', 'Denov tumani', "Jarqo'rg'on tumani",
    'Qiziriq tumani', "Qumqo'rg'on tumani", 'Muzrabot tumani', 'Oltinsoy tumani', 'Sariosiyo tumani',
    'Sherobod tumani', "Sho'rchi tumani", 'Termiz tumani', 'Uzun tumani'] },
  { slug: 'toshkent-viloyati', name: 'Toshkent viloyati', short: 'Toshkent viloyati', districts: [
    'Nurafshon shahri', 'Angren shahri', 'Bekobod shahri', 'Chirchiq shahri', 'Olmaliq shahri', 'Ohangaron shahri',
    "Yangiyo'l shahri", 'Bekobod tumani', "Bo'ka tumani", "Bo'stonliq tumani", 'Chinoz tumani', 'Qibray tumani',
    'Ohangaron tumani', "Oqqo'rg'on tumani", 'Parkent tumani', 'Piskent tumani', 'Quyichirchiq tumani',
    "O'rtachirchiq tumani", "Yangiyo'l tumani", 'Yuqorichirchiq tumani', 'Zangiota tumani', 'Toshkent tumani'] },
  { slug: 'toshkent-shahri', name: 'Toshkent shahri', short: 'Toshkent shahri', districts: [
    'Bektemir tumani', 'Chilonzor tumani', 'Mirobod tumani', "Mirzo Ulug'bek tumani", 'Olmazor tumani',
    'Sergeli tumani', 'Shayxontohur tumani', 'Uchtepa tumani', 'Yakkasaroy tumani', 'Yashnobod tumani',
    'Yunusobod tumani', 'Yangihayot tumani'] },
];

export const SERVICES = [
  { key: 'rozetka', name: 'Rozetka va vyklyuchatel', icon: '🔌' },
  { key: 'avtomat', name: 'Avtomat va shchit', icon: '🧰' },
  { key: 'sim', name: 'Sim tortish', icon: '〰️' },
  { key: 'yoritish', name: 'Yoritish (lyustra, LED)', icon: '💡' },
  { key: 'kamera', name: "Kamera o'rnatish", icon: '📹' },
  { key: 'texnika', name: 'Maishiy texnika ulash', icon: '🔧' },
  { key: 'avariya', name: 'Avariya (qisqa tutashuv)', icon: '⚡' },
  { key: 'boshqa', name: 'Boshqa ishlar', icon: '➕' },
];

export const regionBySlug = (slug) => REGIONS.find((r) => r.slug === slug) || null;
export const serviceByKey = (key) => SERVICES.find((s) => s.key === key) || null;
