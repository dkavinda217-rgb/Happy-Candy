document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Configuration -------------------------
    const firebaseConfig = {
        apiKey: "AIzaSyBwDK63hAFYBElP33DOi6cTdvRoiv5cjJQ",
        authDomain: "happy-candy-store.firebaseapp.com",
        projectId: "happy-candy-store",
        storageBucket: "happy-candy-store.firebasestorage.app",
        messagingSenderId: "317719641073",
        appId: "1:317719641073:web:ab60c3f000488a93642250"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    // ----------------------------------------------------

    // --- State Management ---
    let currentLang = 'en';
    let cart = JSON.parse(localStorage.getItem('happy_candy_cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('happy_candy_wishlist')) || [];
    let users = JSON.parse(localStorage.getItem('happy_candy_users')) || [];
    let currentUser = JSON.parse(localStorage.getItem('happy_candy_user')) || null;
    let selectedPaymentMethod = "Cash on Delivery";
    let generatedResetCode = null;
    let resetEmail = null;
    const ADMIN_EMAIL = "dkavinda217@gmail.com";

    // Default Big Sale Config
    const defaultBigSale = {
        active: true,
        title: "BIG SELLING!",
        name: "Munchee Tipitip Cheese 20g",
        price: "Rs. 50",
        note: "Grab your favorite snack before it's gone! 🧀🍭",
        img: ""
    };
    let bigSaleConfig = JSON.parse(localStorage.getItem('happy_candy_big_sale')) || defaultBigSale;

    // Default Promo Config
    const defaultPromo = {
        active: true,
        l1: "BUY 1",
        l2: "GET 1",
        l3: "FREE!"
    };
    let promoConfig = JSON.parse(localStorage.getItem('happy_candy_promo')) || defaultPromo;

    // Default Site Settings
    const defaultSettings = {
        isJapaneseEnabled: true,
        isVoiceEnabled: true,
        isDarkModeFeatureEnabled: true,
        isCustomCursorEnabled: true,
        isNewsletterEnabled: true,
        isFaqEnabled: true,
        isReviewsEnabled: true,
        isSocialBarEnabled: true,
        isExitPopupEnabled: true,
        isSalesAlertEnabled: true,
        isLockdownMode: false,
        activeFestival: 'none',
        isSitePublished: true
    };
    // Merge loaded settings with defaults to ensure new keys exist
    let loadedSettings = JSON.parse(localStorage.getItem('happy_candy_settings'));
    let appSettings = { ...defaultSettings, ...loadedSettings };

    // --- Permissions Fix: Ensure Admin always has Super rights ---
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        currentUser.isSuperAdmin = true;
        // Optionally update local storage to persist this fix
        localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));
    }

    // Default Hot Deals Config
    const defaultHotDeals = {
        active: false,
        text: "🔥 HOT DEAL: 50% OFF on all Chocolates!",
        bgColor: "#d63031",
        textColor: "#ffffff"
    };
    let hotDealsConfig = JSON.parse(localStorage.getItem('happy_candy_hot_deals')) || defaultHotDeals;

    // Default Homepage Banner Config
    const defaultHomeBanner = {
        active: true,
        title: "BIG SELLING! 🍭",
        badge: "HOT DEALS",
        f1Title: "Combo Packs", f1Desc: "Up to 30% OFF!",
        f2Title: "Fast Delivery", f2Desc: "Free on all orders",
        f3Title: "Best Quality", f3Desc: "International Standards",
        g1: "#ff9f43", g2: "#ff6b6b"
    };
    let homeBannerConfig = JSON.parse(localStorage.getItem('happy_candy_home_banner')) || defaultHomeBanner;

    // Default Payment Config
    const defaultPayment = {
        bankDetails: [
            { name: "DFCC Bank", desc: "Name: M A D Kavinda<br>Acc: 102004405417<br>Branch: Narammala (070)" },
            { name: "Sampath Bank", desc: "Name: M A D Kavinda<br>Acc: 102352457235<br>Branch: KULIYAPITIYA" }
        ],
        bankDetailsJP: [
            { name: "Japan Post Bank (ゆうちょ銀行)", desc: "記号: 1xxxx 番号: 1xxxxxxx<br>名義: カヴィンダ" },
            { name: "MUFG Bank (三菱UFJ銀行)", desc: "支店: xxx 普通: xxxxxxx<br>名義: カヴィンダ" }
        ],
        gateways: [
            { name: "Thirty Third Bank", url: "https://www.33bank.co.jp/" },
            { name: "MUFG Bank", url: "https://www.bk.mufg.jp/" },
            { name: "SMBC Bank", url: "https://www.smbc.co.jp/" }
        ],
        cardEnabled: true
    };
    let paymentConfig = JSON.parse(localStorage.getItem('happy_candy_payment')) || defaultPayment;

    // Default Reviews
    const defaultReviews = [
        { name: "Sandun Perera", text: "My kids absolutely love the variety here! The ordering process was so smooth.", stars: 5 },
        { name: "Priya Silva", text: "Fastest delivery I've ever experienced! The candies arrived fresh and delicious.", stars: 5 },
        { name: "Dilshan Fernando", text: "The packaging is so cute! It felt like receiving a magic box of happiness.", stars: 5 }
    ];
    let appReviews = JSON.parse(localStorage.getItem('happy_candy_reviews')) || defaultReviews;

    // --- Core Admin Logic for Tab Visibility ---
    function toggleAdminTabs() {
        // DEBUG: FORCE VISIBLE FOR EVERYONE
        let isSuper = true;

        // Old Logic (Ignored for now to fix the issue)
        /*
        if (currentUser) {
            const email = currentUser.email || "";
            if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) isSuper = true;
            if (currentUser.isSuperAdmin) isSuper = true;
        }
        */

        // List of sensitive tabs
        const sensitiveTabs = ['payment-tab', 'about-tab', 'security-tab', 'manage-reviews-tab'];

        sensitiveTabs.forEach(id => {
            const btn = document.querySelector(`.admin-tab[data-tab="${id}"]`);
            if (btn) {
                btn.style.display = 'inline-block'; // Force show
            }
        });

        // Show/Hide Hot Deals Section in Promo Tab
        const hdSection = document.getElementById('hot-deals-admin-section');
        if (hdSection) hdSection.style.display = isSuper ? 'block' : 'none';
    }

    // Ensure Admin user exists with specific password
    const adminIndex = users.findIndex(u => u.email === ADMIN_EMAIL);
    const SUPER_ADMIN_PASS = "Dil@9303"; // Master Recovery Password
    const STAFF_REG_CODE = "Staff@9303"; // Secret code for Employee registration

    if (adminIndex === -1) {
        users.push({ name: "Mallawa Arachchige Dilshan Kavinda", email: ADMIN_EMAIL, password: "Dil@9086", photo: "owner.jpg" }); // Default Admin password
        localStorage.setItem('happy_candy_users', JSON.stringify(users));
    } else {
        // Force set Owner Photo if missing or incorrect
        if (users[adminIndex].photo !== "owner.jpg") {
            users[adminIndex].photo = "owner.jpg";
            localStorage.setItem('happy_candy_users', JSON.stringify(users));

            // If currently logged in as admin, update session
            if (currentUser && currentUser.email === ADMIN_EMAIL) {
                currentUser.photo = "owner.jpg";
                localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));
            }
        }
    }


    const translations = {
        en: {
            nav_home: "Home", nav_about: "About", nav_gallery: "Gallery", nav_contact: "Contact Us",
            hero_order: "Order Now", hero_owner: "Meet the Owner",
            hero_desc: "Bringing smiles to every little face with the sweetest, most colorful candies in the world!",
            about_title: "Who We Are? 🍭", about_subtitle: "From Our Heart to Yours", about_magic: "The Magic Behind the Candy",
            about_p1: "Believe it or not, Happy Candy started with a simple dream: to see that pure, sparkling joy in a child's eyes when they discover something magical.",
            about_p2: "We don't just sell treats; we package moments of happiness. Every piece meets high international standards, ensuring safety and quality.",
            promise_1: "International Quality", promise_2: "Kid-Safe Always", promise_3: "100% Pure Happiness",
            gallery_title: "Our Yummy Treats Catalogue", gallery_select: "Select a treat above to see our yummy options! 👆",
            cat_cookies: "Cookies", cat_chips: "Chips", cat_surprises: "Surprises", cat_cakes: "Cakes", cat_local: "Local", cat_chocolate: "Chocolate",
            req_title: "Can't find your Favorite? 🍭", req_desc: "Tell us what sweet treat you are looking for, and we'll try our best to get it for you!",
            contact_title: "Get in Touch!", footer_copy: "© 2026 Happy Candy. Made with ❤️ for Kids.",
            splash_title: "BIG SELLING!", splash_item: "Munchee Tipitip Cheese 20g", splash_now: "Now Only", splash_price: "Rs. 50", splash_note: "Grab your favorite snack before it's gone! 🧀🍭", splash_btn: "Get it Now!",
            catalogue_label: "Catalogue",
            big_selling_title: "BIG SELLING! 🍭", deal_1: "Combo Packs", deal_1_desc: "Up to 30% OFF!", deal_2: "Fast Delivery", deal_2_desc: "Free on all orders", deal_3: "Best Quality", deal_3_desc: "International Standards", view_deals: "View All Deals"
        },
        si: {
            nav_home: "මුල් පිටුව", nav_about: "අපි ගැන", nav_gallery: "ගැලරිය", nav_contact: "සම්බන්ධ වන්න",
            hero_order: "ඇණවුම් කරන්න", hero_owner: "අයිතිකරු හමුවන්න",
            hero_desc: "ලොව පැණිරසම සහ වර්ණවත්ම රසකැවිලි සමඟ සෑම පොඩි දරුවෙකුගේම මුහුණට සිනහවක් ගෙන එන්නෙමු!",
            about_title: "අපි කවුද? 🍭", about_subtitle: "අපේ හදවතින් ඔබ වෙත", about_magic: "රසකැවිලි පිටුපස ඇති මායාව",
            about_p1: "විශ්වාස කරන්න හෝ නොකරන්න, Happy Candy ආරම්භ වූයේ සරල සිහිනයකිනි: දරුවෙකු යමක් සොයා ගන්නා විට ඔවුන්ගේ ඇස්වල ඇති පිරිසිදු ප්‍රීතිය දැකීම.",
            about_p2: "අපි කරන්නේ රසකැවිලි විකිණීම පමණක් නොවේ; අපි සතුට ඇසුරුම් කරමු. සෑම නිෂ්පාදනයක්ම ජාත්‍යන්තර ප්‍රමිතීන්ට අනුකූල වේ.",
            promise_1: "ජාත්‍යන්තර ගුණාත්මකභාවය", promise_2: "දරුවන්ට ආරක්ෂිතයි", promise_3: "100% පිරිසිදු සතුට",
            gallery_title: "අපගේ රසවත් කෑම නාමාවලිය (Catalogue)", gallery_select: "අපගේ රසවත් විකල්ප බැලීමට ඉහත කැමති වර්ගයක් තෝරන්න! 👆",
            cat_cookies: "කුකීස්", cat_chips: "චිප්ස්", cat_surprises: "පුදුම තෑගි", cat_cakes: "කේක්", cat_local: "දේශීය", cat_chocolate: "චොකලට්",
            req_title: "ඔබ කැමතිම එක සොයාගත නොහැකිද? 🍭", req_desc: "ඔබ සොයන රසකැවිලි වර්ගය අපට පවසන්න, අපි එය ගෙන ඒමට උපරිම උත්සාහ කරන්නෙමු!",
            contact_title: "සම්බන්ධ වන්න!", footer_copy: "© 2026 Happy Candy. දරුවන් වෙනුවෙන්ම ❤️ ආදරයෙන් නිපදවන ලදි.",
            splash_title: "මහා විකිණීම!", splash_item: "Munchee Tipitip Cheese 20g", splash_now: "දැන් මිල", splash_price: "Rs. 50", splash_note: "ඉවර වෙන්න කලින් අදම ලබාගන්න! 🧀🍭", splash_btn: "දැන්ම ගන්න!",
            catalogue_label: "නාමාවලිය",
            big_selling_title: "මහා විකිණීම! 🍭", deal_1: "පැකේජ් දීමනා", deal_1_desc: "30% දක්වා වට්ටම්!", deal_2: "වේගවත් බෙදාහැරීම", deal_2_desc: "සියලුම ඇණවුම් සඳහා නොමිලේ", deal_3: "ඉහළම ගුණාත්මකභාවය", deal_3_desc: "ජායන්තර ප්‍රමිතීන්", view_deals: "සියලුම දීමනා බලන්න"
        },
        ta: {
            nav_home: "முகப்பு", nav_about: "எங்களைப் பற்றி", nav_gallery: "கேலரி", nav_contact: "தொடர்பு கொள்ள",
            hero_order: "இப்போதே ஆர்டர் செய்யுங்கள்", hero_owner: "உரிமையாளரைச் சந்திக்கவும்",
            hero_desc: "உலகின் இனிமையான மற்றும் வண்ணமயமான மிட்டாய்களுடன் ஒவ்வொரு சிறு குழந்தையின் முகத்திலும் புன்னகையைக் கொண்டு வருகிறோம்!",
            about_title: "நாங்கள் யார்? 🍭", about_subtitle: "எங்கள் இதயத்திலிருந்து உங்களுடையது", about_magic: "மிட்டாய்க்கு பின்னால் உள்ள மந்திரம்",
            about_p1: "நம்புங்கள் அல்லது நம்பாதீர்கள், ஹேப்பி கேண்டி ஒரு எளிய கனவோடு தொடங்கியது: ஒரு குழந்தை எதையாவது கண்டுபிடிக்கும்போது அவர்களின் கண்களில் உள்ள தூய மகிழ்ச்சியைக் காண.",
            about_p2: "நாங்கள் விருந்துகளை மட்டும் விற்பதில்லை; நாங்கள் மகிழ்ச்சியின் தருணங்களை தொகுக்கிறோம். ஒவ்வொரு துண்டும் சர்வதேச தரத்திற்கு ஏற்ப பாதுகாப்பாக தயாரிக்கப்படுகிறது.",
            promise_1: "சர்வதேச தரம்", promise_2: "குழந்தை-பாதுகாப்பானது", promise_3: "100% தூய மகிழ்ச்சி",
            gallery_title: "எங்கள் சுவையான விருந்துகள் பட்டியல் (Catalogue)", gallery_select: "எங்கள் சுவையான விருப்பங்களைக் காண மேலே ஒரு வகையைத் தேர்ந்தெடுக்கவும்! 👆",
            cat_cookies: "குக்கீகள்", cat_chips: "சிப்ஸ்", cat_surprises: "ஆச்சரியங்கள்", cat_cakes: "கேக்", cat_local: "உள்ளூர்", cat_chocolate: "சாக்லேட்",
            req_title: "உங்களுக்கு பிடித்ததை கண்டுபிடிக்க முடியவில்லையா? 🍭", req_desc: "நீங்கள் தேடும் இனிப்பு எது என்று எங்களிடம் கூறுங்கள், நாங்கள் அதை உங்களிடம் கொண்டு வர முயற்சிப்போம்!",
            contact_title: "தொடர்பு கொள்ளுங்கள்!", footer_copy: "© 2026 ஹேப்பி கேண்டி. குழந்தைகளுக்காக ❤️ அன்புடன் உருவாக்கப்பட்டது.",
            splash_title: "மெகா விற்பனை!", splash_item: "Munchee Tipitip Cheese 20g", splash_now: "இப்போது மட்டும்", splash_price: "Rs. 50", splash_note: "முடிவதற்குள் இப்போதே வாங்குங்கள்! 🧀🍭", splash_btn: "இப்போதே பெறுங்கள்!",
            catalogue_label: "பட்டியல்",
            big_selling_title: "மெகா விற்பனை! 🍭", deal_1: "காம்போ பேக்குகள்", deal_1_desc: "30% வரை தள்ளுபடி!", deal_2: "வேகமான விநியோகம்", deal_2_desc: "அனைத்து ஆர்டர்களுக்கும் இலவசம்", deal_3: "சிறந்த தரம்", deal_3_desc: "சர்வதேச தரநிலைகள்", view_deals: "அனைத்து ஒப்பந்தங்களையும் பார்க்கவும்"
        },
        jp: {
            nav_home: "ホーム", nav_about: "私たちについて", nav_gallery: "ギャラリー", nav_contact: "お問い合わせ",
            hero_order: "今すぐ注文", hero_owner: "オーナーに会う",
            hero_desc: "世界で最も甘く、最もカラフルなキャンディーで、すべての子供たちの顔に笑顔を届けます！",
            about_title: "私たちは誰ですか？ 🍭", about_subtitle: "Mallawa Arachchilage Dilshan Kavinda", about_magic: "ハッピーキャンディーの魔法",
            about_p1: "「ハッピーキャンディー」の物語は、単なるお菓子作りから始まったのではありません。それは、創設者であるディルシャン・カヴィンダがスリランカから日本へ、そして世界中を旅する中で出会った「笑顔の魔法」を形にしたいという情熱から生まれました。私たちは、子供時代に感じたあの純粋な好奇心と、新しい味に出会った時の輝く瞳を、現代の子供たちにも体験してもらいたいと考えています。世界各地から厳選された、見た目も鮮やかで最高品質のキャンディーやスイーツは、一つひとつが物語を持っています。",
            about_p2: "日本という素晴らしい国で、私たちは「安全・安心」という最も重要な価値観を土台にしています。スリランカの伝統的な温かさと、日本の細やかな品質管理を融合させ、国際基準をクリアしたプレミアムな商品のみをお届けしています。親御様にとって、子供たちに与えるものは何よりも安心できるものであるべきです。だからこそ、私たちは原材料の選定からお届けに至るまで、徹底的なこだわりを持っています。ディルシャン・カヴィンダ率いるハッピーキャンディーは、単なるショップではなく、ご家族に一生残る「甘い思い出」を届けるライフタイムパートナーでありたいと願っています。",
            promise_1: "国際品質基準の遵守", promise_2: "妥協のない安全性", promise_3: "一生残る幸せな体験",
            gallery_title: "美味しいお菓子カタログ (Catalogue)", gallery_select: "上のカテゴリーを選んで、美味しいメニューを見てね！ 👆",
            cat_cookies: "クッキー", cat_chips: "チップス", cat_surprises: "サプライズ", cat_cakes: "ケーキ", cat_local: "ローカル", cat_chocolate: "チョコレート",
            req_title: "お気に入りが見つかりませんか？ 🍭", req_desc: "探しているお菓子を教えてください。お届けできるよう最善を尽くします！",
            contact_title: "連絡先", footer_copy: "© 2026 ハッピーキャンディー。子供たちのために❤️を込めて作られました。",
            splash_title: "大セール開催中！", splash_item: "マンチー・ティピティップ・チーズ 20g", splash_now: "今だけ特別価格", splash_price: "¥ 75", splash_note: "売り切れる前にお早めに！ 🧀🍭", splash_btn: "今すぐ購入！",
            catalogue_label: "カタログ",
            big_selling_title: "大セール開催中！ 🍭", deal_1: "コンボパック", deal_1_desc: "最大30% OFF!", deal_2: "迅速な配送", deal_2_desc: "全品送料無料", deal_3: "最高品質", deal_3_desc: "国際基準の安全性", view_deals: "セール品を見る"
        }
    };

    // --- Initialize EmailJS ---
    // Note: You need to replace 'YOUR_PUBLIC_KEY' with your actual key from EmailJS dashboard
    (function () {
        if (typeof emailjs !== 'undefined') {
            emailjs.init("YOUR_PUBLIC_KEY");
        }
    })();

    // --- Candy Rain Effect ---
    function createCandyRain() {
        const container = document.createElement('div');
        container.className = 'candy-rain-container';
        document.body.appendChild(container);

        let candyIcons = ['fa-candy-cane', 'fa-cookie', 'fa-lollipop', 'fa-ice-cream', 'fa-cookie-bite', 'fa-pepper-hot'];
        let colors = ['#ff6b81', '#7bed9f', '#70a1ff', '#eccc68', '#ff7f50', '#a29bfe'];

        if (currentLang === 'jp') {
            candyIcons = ['fa-bowl-rice', 'fa-fish-fin', 'fa-shrimp', 'fa-leaf', 'fa-bowl-food', 'fa-ice-cream'];
            colors = ['#ff4d4d', '#ffffff', '#2d5a27', '#f1c40f', '#e67e22']; // Japan palette (Red, White, Green, Orange)
        }

        for (let i = 0; i < 40; i++) {
            const candy = document.createElement('div');
            candy.className = 'falling-candy';

            const icon = candyIcons[Math.floor(Math.random() * candyIcons.length)];
            candy.innerHTML = `<i class="fas ${icon}"></i>`;

            // Random properties
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = 3 + Math.random() * 4;
            const size = 1 + Math.random() * 1.5;
            const color = colors[Math.floor(Math.random() * colors.length)];

            candy.style.left = `${left}%`;
            candy.style.animationDelay = `${delay}s`;
            candy.style.animationDuration = `${duration}s`;
            candy.style.fontSize = `${size}rem`;
            candy.style.color = color;
            candy.style.opacity = '0.7';

            container.appendChild(candy);

            // Remove after animation finishes
            setTimeout(() => {
                candy.remove();
            }, (delay + duration) * 1000);
        }

        // Remove container after some time
        setTimeout(() => {
            container.remove();
        }, 12000);
    }

    createCandyRain();

    // --- Currency Conversion Logic ---
    const LKR_TO_JPY = 0.50; // Real exchange rate approx. 0.50 JPY per 1 LKR

    function formatPriceValue(lkrValue) {
        if (currentLang === 'jp') {
            // Real conversion + ¥50 markup as requested
            const jpyValue = Math.round(lkrValue * LKR_TO_JPY) + 50;
            return `¥ ${jpyValue.toLocaleString()}`;
        }
        return `Rs. ${lkrValue.toLocaleString()}`;
    }

    function formatPrice(lkrPriceStr) {
        if (!lkrPriceStr) return "";
        const value = parseInt(lkrPriceStr.toString().replace(/[^0-9]/g, '')) || 0;
        return formatPriceValue(value);
    }

    // --- Big Sale Splash Logic ---

    // --- Big Sale Splash Logic ---
    const saleSplash = document.getElementById('sale-splash');
    const splashCloseBtn = document.getElementById('splash-close-btn');

    function updateBigSaleUI() {
        if (!saleSplash) return;

        if (!bigSaleConfig.active) {
            saleSplash.style.display = 'none'; // Completely hide if inactive
            return;
        } else {
            saleSplash.style.display = 'flex'; // Show if active (managed by opacity in CSS usually, but this ensures it's there)
        }

        // Update Splash Text
        const titleEl = document.getElementById('splash-title');
        const nameEl = document.getElementById('splash-item-name');
        const priceEl = document.getElementById('splash-item-price');
        const noteEl = document.getElementById('splash-item-note');

        if (titleEl) titleEl.innerText = bigSaleConfig.title;
        if (nameEl) nameEl.innerText = bigSaleConfig.name;
        if (priceEl) priceEl.innerText = bigSaleConfig.price;
        if (noteEl) noteEl.innerText = bigSaleConfig.note;

        // Update Buy Button
        const splashBtn = saleSplash.querySelector('.splash-btn');
        if (splashBtn) {
            // Remove old listener to avoid duplicates if called multiple times (simple clone replace)
            const newBtn = splashBtn.cloneNode(true);
            splashBtn.parentNode.replaceChild(newBtn, splashBtn);

            newBtn.addEventListener('click', () => {
                const splashParams = {
                    active: bigSaleConfig.active,
                    title: bigSaleConfig.title,
                    name: bigSaleConfig.name,
                    price: bigSaleConfig.price,
                    note: bigSaleConfig.note,
                    img: bigSaleConfig.img
                };

                if (window.addToCart) {
                    // Use configured image or fallback
                    const img = splashParams.img || "Munchee Tipitip Cheese 20g.jpg";
                    window.addToCart(splashParams.name, splashParams.price, img);
                }

                removeSplash();
            });
        }
    }

    // --- Update Body Section Big Sale ---
    function updateBigSaleBody() {
        const container = document.getElementById('big-sale-product-container');
        if (!container) return;

        if (!bigSaleConfig.active) {
            container.style.display = 'none';
            return;
        }

        const safeName = bigSaleConfig.name.replace(/'/g, "\\'");
        const safeImg = (bigSaleConfig.img || "Munchee Tipitip Cheese 20g.jpg").replace(/'/g, "\\'");

        container.style.display = 'block';
        container.innerHTML = `
            <div class="big-sale-featured-card" style="background:#fff; border-radius:20px; padding:20px; display:flex; flex-wrap:wrap; align-items:center; gap:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1); max-width:800px; margin:0 auto;">
                <div class="big-sale-img" style="flex:1; min-width:200px; text-align:center;">
                    <img src="${safeImg}" alt="${bigSaleConfig.name}" style="max-width:100%; max-height:200px; border-radius:15px;" onerror="this.src='https://ui-avatars.com/api/?name=Big+Sale&background=ff9f43&color=fff&size=200'">
                </div>
                <div class="big-sale-info" style="flex:2; min-width:250px;">
                    <span style="background:var(--primary-color); color:#fff; padding:5px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">🔥 Limited Time Offer</span>
                    <h3 style="margin:10px 0; font-size:1.8rem; color:#333;">${bigSaleConfig.title || 'Special Deal'}</h3>
                    <h4 style="margin-bottom:5px; color:#555;">${bigSaleConfig.name}</h4>
                    <p style="color:#666; margin-bottom:15px;">${bigSaleConfig.note}</p>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:1.5rem; font-weight:bold; color:var(--primary-color);">${bigSaleConfig.price}</span>
                        <button class="btn-primary pulse" onclick="addToCart('${safeName}', '${bigSaleConfig.price}', '${safeImg}')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Wrap both updates
    const originalUpdateBigSaleUI = updateBigSaleUI;
    updateBigSaleUI = function () {
        originalUpdateBigSaleUI();
        updateBigSaleBody();
    };

    // Helper to close splash
    function removeSplash() {
        if (!saleSplash) return;
        saleSplash.style.opacity = '0';
        saleSplash.style.pointerEvents = 'none';
        setTimeout(() => {
            saleSplash.style.display = 'none';
        }, 800);
    }

    // --- Update Promo Badge UI ---
    function updatePromoBadgeUI() {
        const badge = document.getElementById('promo-badge');
        if (!badge) return;

        if (!promoConfig.active) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'flex';
            document.getElementById('promo-line-1').innerText = promoConfig.l1;
            document.getElementById('promo-line-2').innerText = promoConfig.l2;
            document.getElementById('promo-line-3').innerText = promoConfig.l3;
        }
    }

    if (saleSplash) {
        // Initialize
        updateBigSaleUI();
        updatePromoBadgeUI();

        // Only show/animate if active
        if (bigSaleConfig.active) {
            // Auto-remove after 6 seconds
            const autoRemove = setTimeout(removeSplash, 6000);

            // Close on X
            if (splashCloseBtn) {
                splashCloseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    clearTimeout(autoRemove);
                    removeSplash();
                });
            }

            // Instant remove on background click
            saleSplash.addEventListener('click', (e) => {
                clearTimeout(autoRemove);
                removeSplash();
            });
        } else {
            saleSplash.style.display = 'none';
        }
    }
    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // --- Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    if (navLinks) navLinks.classList.remove('active'); // Close menu on click
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // --- Contact Form Handling ---
    const contactForm = document.getElementById('contactForm');
    const messageInput = contactForm ? contactForm.querySelector('textarea') : null;
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    const btnEmail = document.getElementById('btn-email');

    // Phone number for WhatsApp
    const whatsappNumber = "94789086123";
    const emailAddress = "dkavinda217@gmail.com";

    if (btnWhatsapp && messageInput) {
        btnWhatsapp.addEventListener('click', () => {
            const msg = messageInput.value;
            if (!msg.trim()) {
                alert("Please enter a message!");
                return;
            }
            const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        });
    }

    if (btnEmail && messageInput) {
        btnEmail.addEventListener('click', () => {
            const msg = messageInput.value;
            // Try to find name/email inputs if they exist
            const nameInput = contactForm.querySelector('input[type="text"]');
            const mailInput = contactForm.querySelector('input[type="email"]');

            let body = `Name: ${nameInput ? nameInput.value : 'N/A'}\n`;
            body += `Email: ${mailInput ? mailInput.value : 'N/A'}\n\n`;
            body += `Message:\n${msg}`;

            const subject = `New Inquiry from ${nameInput ? nameInput.value : 'Happy Candy Visitor'}`;
            const url = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = url;
        });
    }

    // --- Scroll Animations ---
    const revealElements = document.querySelectorAll('.gallery-item, .owner-card, .contact-wrapper');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 150;

        revealElements.forEach(el => {
            const revealTop = el.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    };

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
    });

    window.addEventListener('scroll', revealOnScroll);


    // --- Product Data Initialization ---
    const defaultCategories = [
        { id: 'cookies', name: 'Cookies', icon: 'fa-cookie', color: '#ffeaa7', iconColor: '#fdcb6e' },
        { id: 'chips', name: 'Chips', icon: 'fa-fire', color: '#fab1a0', iconColor: '#e17055' },
        { id: 'surprises', name: 'Surprises', icon: 'fa-parachute-box', color: '#81ecec', iconColor: '#00cec9' },
        { id: 'cakes', name: 'Cakes', icon: 'fa-birthday-cake', color: '#a29bfe', iconColor: '#6c5ce7' },
        { id: 'local', name: 'Local', icon: 'fa-flag', color: '#55efc4', iconColor: '#00b894' },
        { id: 'chocolate', name: 'Chocolate', icon: 'fa-candy-cane', color: '#ff7675', iconColor: '#d63031' }
    ];



    const defaultProducts = {
        cookies: [
            { id: Date.now() + 1, name: "Ali Bobo Tiny Mico Macoroon Biscuits Fresh Strawberry Yogurt Flavor 50g", price: "Rs. 1080", img: "Ali Bobo Tiny Mico Macoroon Biscuits Fresh Strawberry Yogurt Flavor 50g.jpg", icon: "fa-cookie", desc: "Premium mini macaroons with real strawberry yogurt filling." },
            { id: Date.now() + 2, name: "Baby Monster Oreo Mini Original", price: "Rs. 1000", img: "Baby Monster Oreo Mini Original.jpg", icon: "fa-cookie-bite", desc: "Cute mini Oreos, perfect for a quick sweet snack." },
            { id: Date.now() + 3, name: "Britannia Good Day Chocochip Cookies 44g", price: "Rs. 480", img: "Britannia Good Day Chocochip Cookies 44g.jpg", icon: "fa-cookie", desc: "Crunchy cookies loaded with delicious chocolate chips." }
        ],
        chips: [
            { id: Date.now() + 4, name: "Boehli Mini Bretzels 100g", price: "Rs. 1980", img: "Boehli Mini Bretzels 100g.jpg", icon: "fa-bread-slice", desc: "Classic salty pretzels, perfect for anytime snacking." },
            { id: Date.now() + 5, name: "Calbee Harvest Snaps Baked Pea Crisps Original Salted (5 Induvidual Packs 18g) 90g", price: "Rs. 2980", img: "Calbee Harvest Snaps Baked Pea Crisps Original Salted (5 Induvidual Packs 18g) 90g.jpg", icon: "fa-seedling", desc: "Healthy baked pea crisps with a touch of salt." }
        ],
        surprises: [],
        cakes: [],
        local: [],
        chocolate: []
    };

    const defaultProductsJP = {
        cookies: [],
        chips: [],
        surprises: [],
        cakes: [],
        local: [],
        chocolate: []
    };

    // Persistent State
    let appCategories = JSON.parse(localStorage.getItem('happy_candy_categories')) || defaultCategories;

    // Safety: Ensure all default categories exist
    defaultCategories.forEach(defCat => {
        if (!appCategories.find(c => c.id === defCat.id)) {
            appCategories.push(defCat);
        }
    });

    let products = JSON.parse(localStorage.getItem('happy_candy_inventory_en')) || defaultProducts;
    let productsJP = JSON.parse(localStorage.getItem('happy_candy_inventory_jp')) || defaultProductsJP;

    // --- Firebase Sync Logic ---
    const shopDocRef = db.collection('shop_data').doc('main_config');

    function loadFromFirebase() {
        console.log("Syncing with Cloud... ☁️");
        shopDocRef.get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();

                // Timestamp merge logic
                const cloudTimestamp = data.lastUpdated ? (data.lastUpdated.toMillis ? data.lastUpdated.toMillis() : 0) : 0;
                const localTimestamp = parseInt(localStorage.getItem('happy_candy_last_sync')) || 0;

                // Sync if cloud is newer OR if this is the first time (local empty)
                if (cloudTimestamp > localTimestamp || !localStorage.getItem('happy_candy_last_sync')) {
                    console.log("Cloud Data Found! Updating local state...");

                    if (data.categories) appCategories = data.categories;
                    if (data.inventory) products = data.inventory;
                    if (data.inventoryJP) productsJP = data.inventoryJP;
                    if (data.payment) paymentConfig = data.payment;
                    if (data.bigSale) bigSaleConfig = data.bigSale;
                    if (data.promo) promoConfig = data.promo;
                    if (data.settings) {
                        // Merge cloud settings with defaults to prevent losing new keys
                        appSettings = { ...defaultSettings, ...data.settings };
                    }
                    if (data.adminPassword) {
                        const adminIndex = users.findIndex(u => u.email === ADMIN_EMAIL);
                        if (adminIndex !== -1) {
                            users[adminIndex].password = data.adminPassword;
                            localStorage.setItem('happy_candy_users', JSON.stringify(users));
                        }
                    }
                    if (data.about) {
                        localStorage.setItem('happy_candy_about', JSON.stringify(data.about));
                    }

                    // Update Local Storage for offline backup
                    localStorage.setItem('happy_candy_categories', JSON.stringify(appCategories));
                    localStorage.setItem('happy_candy_inventory_en', JSON.stringify(products));
                    localStorage.setItem('happy_candy_inventory_jp', JSON.stringify(productsJP));
                    localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
                    localStorage.setItem('happy_candy_big_sale', JSON.stringify(bigSaleConfig));
                    localStorage.setItem('happy_candy_promo', JSON.stringify(promoConfig));
                    localStorage.setItem('happy_candy_settings', JSON.stringify(appSettings));
                    localStorage.setItem('happy_candy_last_sync', cloudTimestamp);
                } else {
                    console.log("Local data is newer or identical. Skipping cloud pull.");
                }

                // Re-render ALL elements to ensure visibility
                renderGalleryCategories();
                renderAdminCategoryOptions();
                if (typeof renderAdminCategoryList === 'function') renderAdminCategoryList();
                if (typeof renderAdminProductList === 'function') renderAdminProductList();

                // --- Hot Deals Sync ---
                if (data.hotDeals) hotDealsConfig = data.hotDeals;
                renderHotDealsBanner();

                // --- Home Banner Sync ---
                if (data.homeBanner) homeBannerConfig = data.homeBanner;
                renderHomeBanner();

                // --- Reviews Sync ---
                if (data.reviews) {
                    appReviews = data.reviews;
                    localStorage.setItem('happy_candy_reviews', JSON.stringify(appReviews));
                    renderReviews();
                }

                updatePaymentUI(selectedPaymentMethod);
                updatePromoBadgeUI();
                applySettings(); // Apply UI toggles

                // Refresh products if a category is active
                const activeCatEl = document.querySelector('.gallery-item.active');
                if (activeCatEl) {
                    renderProducts(activeCatEl.getAttribute('data-category'));
                } else {
                    renderProducts('cookies');
                }

                // Check Publish Status
                const loader = document.getElementById('site-loader');
                const loaderText = document.getElementById('loader-text');
                const loaderProgress = document.getElementById('loader-progress');
                const maintenanceLogin = document.getElementById('maintenance-login');

                if (appSettings.isSitePublished === false && !sessionStorage.getItem('super_admin_unlocked')) {
                    // Site is unpublished (Maintenance Mode)
                    loaderText.innerText = "Construction Mode Active 🚧";
                    loaderText.style.color = "#e17055";
                    loaderProgress.style.display = 'none';
                    maintenanceLogin.style.display = 'block';
                    // Do NOT hide loader
                    // Do NOT hide loader
                }
                // else: Do nothing, let window.onload handle the hiding for smoother experience


                console.log("Sync Complete! ✅");
            } else {
                console.log("No Cloud Data. Uploading Local Data... ⬆️");
                saveDataToFirebase();
            }
        }).catch((error) => {
            console.error("Error getting document:", error);
        });
    }

    function saveDataToFirebase() {
        // Save to Local Storage first for speed
        localStorage.setItem('happy_candy_inventory_en', JSON.stringify(products));
        localStorage.setItem('happy_candy_inventory_jp', JSON.stringify(productsJP));
        localStorage.setItem('happy_candy_categories', JSON.stringify(appCategories));
        localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
        localStorage.setItem('happy_candy_big_sale', JSON.stringify(bigSaleConfig));
        localStorage.setItem('happy_candy_promo', JSON.stringify(promoConfig));
        localStorage.setItem('happy_candy_settings', JSON.stringify(appSettings));
        localStorage.setItem('happy_candy_hot_deals', JSON.stringify(hotDealsConfig));
        localStorage.setItem('happy_candy_home_banner', JSON.stringify(homeBannerConfig));
        localStorage.setItem('happy_candy_reviews', JSON.stringify(appReviews));


        // Also save a local timestamp to prevent overwriting with old cloud data on reload
        localStorage.setItem('happy_candy_last_sync', Date.now());

        const aboutData = JSON.parse(localStorage.getItem('happy_candy_about')) || {};
        const adminUser = users.find(u => u.email === ADMIN_EMAIL);
        const adminPassword = adminUser ? adminUser.password : "Dil@9303";

        // Save to Cloud
        shopDocRef.set({
            categories: appCategories,
            inventory: products,
            inventoryJP: productsJP,
            payment: paymentConfig,
            bigSale: bigSaleConfig,
            promo: promoConfig,
            promol1: promoConfig.l1,
            hotDeals: hotDealsConfig,
            homeBanner: homeBannerConfig,
            reviews: appReviews,
            settings: appSettings,
            about: aboutData,
            adminPassword: adminPassword,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log("Cloud Save Success! ☁️✅");
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
                alert("Error saving to cloud! Please check internet connection. ❌");
            });

        // Render updates
        renderGalleryCategories();
        renderAdminCategoryOptions();
        if (typeof renderAdminCategoryList === 'function') renderAdminCategoryList();
        if (typeof renderAdminProductList === 'function') renderAdminProductList();
    }

    // Call Sync on Load
    loadFromFirebase();

    // Alias for old function calls
    function saveInventory() {
        saveDataToFirebase();
    }

    // --- Product Modal Logic ---
    const productModal = document.getElementById('product-modal');
    const closeProductModal = document.getElementById('close-product-modal');
    const modalProductImg = document.getElementById('modal-product-img');
    const modalProductIcon = document.getElementById('modal-product-icon');
    const modalProductName = document.getElementById('modal-product-name');
    const modalProductPrice = document.getElementById('modal-product-price');
    const modalProductDesc = document.getElementById('modal-product-desc');
    const modalQtyInput = document.getElementById('modal-qty');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart');
    const qtyPlus = document.querySelector('.qty-btn.plus');
    const qtyMinus = document.querySelector('.qty-btn.minus');

    let currentModalProduct = null;

    function openProductModal(product) {
        currentModalProduct = product;
        modalProductName.textContent = product.name;
        modalProductPrice.textContent = formatPrice(product.price);
        modalProductDesc.textContent = product.desc || "";
        modalQtyInput.value = 1;

        if (product.img) {
            modalProductImg.src = product.img;
            modalProductImg.style.display = 'block';
            modalProductIcon.style.display = 'none';
        } else {
            modalProductImg.style.display = 'none';
            modalProductIcon.style.display = 'flex';
            modalProductIcon.querySelector('i').className = `fas ${product.icon || 'fa-candy-cane'}`;
        }

        productModal.classList.add('active');
    }

    // Expose to global scope for inline onclick handlers
    window.openProductModal = openProductModal;

    if (closeProductModal) {
        closeProductModal.addEventListener('click', () => {
            productModal.classList.remove('active');
        });
    }

    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) productModal.classList.remove('active');
        });
    }

    if (qtyPlus) {
        qtyPlus.addEventListener('click', () => {
            modalQtyInput.value = parseInt(modalQtyInput.value) + 1;
        });
    }

    if (qtyMinus) {
        qtyMinus.addEventListener('click', () => {
            if (parseInt(modalQtyInput.value) > 1) {
                modalQtyInput.value = parseInt(modalQtyInput.value) - 1;
            }
        });
    }

    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', () => {
            if (currentModalProduct) {
                const qty = parseInt(modalQtyInput.value);
                for (let i = 0; i < qty; i++) {
                    addToCart(currentModalProduct.name, currentModalProduct.price, currentModalProduct.img);
                }
                productModal.classList.remove('active');
            }
        });
    }

    const categoryItems = document.querySelectorAll('.gallery-item');
    const productDisplay = document.getElementById('product-display');
    const catalogueToggle = document.getElementById('catalogue-toggle');

    if (catalogueToggle) {
        catalogueToggle.addEventListener('click', () => {
            document.querySelector('.gallery-grid').scrollIntoView({ behavior: 'smooth' });
        });
    }

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all
            categoryItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked
            item.classList.add('active');

            const category = item.getAttribute('data-category');
            renderProducts(category);
        });
    });

    function renderProducts(category) {
        let items = currentLang === 'jp' ? productsJP[category] : products[category];
        if (!items) return;

        // Apply Global Sort
        const sortVal = document.getElementById('product-sort')?.value || 'default';
        items = [...items]; // Clone to avoid mutating original
        if (sortVal === 'price-low') items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        else if (sortVal === 'price-high') items.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
        else if (sortVal === 'name-az') items.sort((a, b) => a.name.localeCompare(b.name));

        let html = '<div class="product-list">';
        items.forEach((product, idx) => {
            const safeName = product.name.replace(/'/g, "\\'");
            const safeImg = product.img.replace(/'/g, "\\'");
            const iconClass = product.icon || 'fa-candy-cane';

            // Random Rating
            const rating = 4 + Math.floor(Math.random() * 2);
            let ratingHtml = '<div class="candy-rating">';
            for (let i = 0; i < 5; i++) {
                ratingHtml += `<i class="fas fa-candy-cane" style="color:${i < rating ? 'var(--primary-color)' : '#ddd'}"></i>`;
            }
            ratingHtml += '</div>';

            const stock = product.stock !== undefined ? product.stock : 15;
            const stockHtml = stock <= 5
                ? `<span class="stock-status stock-low">Only ${stock} Left!</span>`
                : `<span class="stock-status stock-instock">In Stock</span>`;

            // Dynamic Badges (Random for demo, but can be data-driven)
            let badgeHtml = '';
            if (idx === 0) badgeHtml = '<div class="product-badge badge-new">New Arrival</div>';
            else if (idx === 2) badgeHtml = '<div class="product-badge badge-best">Best Seller</div>';

            html += `
                <div class="product-card reveal" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")})'>
                    ${badgeHtml}
                    <div class="product-img-wrapper" style="position:relative; height:150px; background:#f9f9f9; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                        <img src="${product.img}" alt="${product.name}" class="product-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="product-icon-fallback" style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:4rem; color:var(--primary-color);">
                            <i class="fas ${iconClass}"></i>
                        </div>
                    </div>
                    <div style="padding:0 5px;">
                        <h4 class="product-name" style="margin-top:10px;">${product.name}</h4>
                        ${ratingHtml}
                        <p class="product-desc" style="font-size:0.85rem; color:#666; margin:5px 0 10px; line-height:1.3; height:35px; overflow:hidden;">${product.desc || ''}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="product-price">${formatPrice(product.price)}</span>
                            ${stockHtml}
                        </div>
                    </div>
                    <div class="product-buttons" onclick="event.stopPropagation()">
                        <button class="btn-buy" onclick="orderProduct('${safeName}')">Buy Now</button>
                        <button class="btn-cart" onclick="addToCartWithEffect(event, '${safeName}', '${product.price}', '${safeImg}')">Add to Cart</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        productDisplay.innerHTML = html;
        productDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Sort Event Listener
    document.getElementById('product-sort')?.addEventListener('change', () => {
        const currentCat = document.querySelector('.gallery-item.active')?.getAttribute('data-category') || 'cookies';
        renderProducts(currentCat);
    });

    // --- Cart Logic ---
    cart = [];
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartToggle = document.getElementById('cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutBtnSms = document.getElementById('checkout-btn-sms');
    const paymentDetailsArea = document.getElementById('payment-details-area');

    function toggleCart() {
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.toggle('active');
            cartOverlay.classList.toggle('active');
        }
    }

    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    function parsePrice(priceStr) {
        return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
    }

    function updateCartUI() {
        if (!cartCountElement || !cartItemsContainer || !cartTotalElement) return;

        const mobileCount = document.querySelector('.mobile-cart-count');
        let totalItems = 0;
        let totalPrice = 0;

        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty! Add some specific sweets. 🍭</p>';
            if (mobileCount) mobileCount.textContent = 0;
            cartCountElement.textContent = 0;
            cartTotalElement.textContent = 'Rs. 0';
            document.getElementById('discount-display').style.display = 'none';
            return;
        }

        const filteredCart = cart.filter(item => {
            if (currentLang === 'jp') return item.isJP === true;
            return item.isJP !== true;
        });

        if (filteredCart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">No items for this language. 🍭</p>';
        } else {
            filteredCart.forEach((item) => {
                const originalIndex = cart.indexOf(item);
                totalItems += item.quantity;
                totalPrice += parsePrice(item.price) * item.quantity;

                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-content" style="display:flex; gap:10px; flex:1;">
                        <img src="${item.img}" alt="${item.name}" onerror="this.src='https://ui-avatars.com/api/?name=Treat&background=ff6b81&color=fff'">
                        <div class="cart-item-info">
                            <span class="cart-item-name">${item.name}</span>
                            <span class="cart-item-price">${formatPrice(item.price)} x ${item.quantity}</span>
                        </div>
                    </div>
                    <button class="remove-item" data-index="${originalIndex}"><i class="fas fa-trash"></i></button>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }

        // Handle Coupon
        let discount = 0;
        if (activeCoupon) {
            discount = Math.floor(totalPrice * activeCoupon.percent / 100);
            const discDisp = document.getElementById('discount-display');
            if (discDisp) {
                discDisp.style.display = 'flex';
                discDisp.style.justifyContent = 'space-between';
                document.getElementById('discount-amount').textContent = `-Rs. ${discount}`;
            }
        } else {
            const discDisp = document.getElementById('discount-display');
            if (discDisp) discDisp.style.display = 'none';
        }

        cartCountElement.textContent = totalItems;
        if (mobileCount) mobileCount.textContent = totalItems;
        cartTotalElement.textContent = `Rs. ${totalPrice - discount}`;

        // Re-attach Remove listeners
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                cart.splice(index, 1);
                localStorage.setItem('happy_candy_cart', JSON.stringify(cart));
                updateCartUI();
            });
        });
    }

    let activeCoupon = null;
    const coupons = { 'CANDY10': 10, 'SWEET5': 5, 'HAPPY20': 20 };

    const applyCouponBtn = document.getElementById('coupon-input-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => {
            const input = document.getElementById('coupon-input').value.toUpperCase().trim();
            if (coupons[input]) {
                activeCoupon = { code: input, percent: coupons[input] };
                updateCartUI();
                alert(`Coupon applied: ${input} (${coupons[input]}% OFF)! 🎟️✅`);
            } else {
                alert("Invalid coupon code. 🎟️❌");
            }
        });
    }

    // Expose Global Functions
    window.orderProduct = function (productName) {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
            if (messageInput) {
                messageInput.value = `Hi! I would like to order: ${productName}.`;
                messageInput.focus();
            }
        }
    };

    window.addToCart = function (productName, productPrice, productImg) {
        // Check if item exists
        const existingItemIndex = cart.findIndex(item => item.name === productName);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({
                name: productName,
                price: productPrice,
                img: productImg,
                quantity: 1,
                isJP: currentLang === 'jp'
            });
        }

        updateCartUI();

        // Open sidebar if not open
        if (cartSidebar && !cartSidebar.classList.contains('active')) {
            toggleCart();
        }
    };

    // Payment Method Selection & Dynamic UI
    selectedPaymentMethod = "Cash on Delivery";
    const payMethods = document.querySelectorAll('.pay-method');

    function updatePaymentUI(method) {
        if (!paymentDetailsArea) return;

        let html = '';
        if (method === "Cash on Delivery") {
            html = `
                <h5 data-i18n="pay_address">Delivery Address</h5>
                <textarea id="cus-address" class="address-input" placeholder="Enter your full delivery address..." rows="3"></textarea>
            `;
        } else if (method === "Bank Transfer") {
            let bankList = '';

            // Use Japan Specific or Default based on language
            let banks = paymentConfig.bankDetails;
            if (currentLang === 'jp' && paymentConfig.bankDetailsJP && appSettings.isJapaneseEnabled) {
                banks = paymentConfig.bankDetailsJP;
            }

            if (banks && banks.length > 0) {
                bankList = banks.map(bank => `
                    <div class="bank-info-card">
                        <h5>${bank.name}</h5>
                        <p><strong>Details:</strong> ${bank.desc}</p>
                    </div>
                 `).join('');
            } else {
                bankList = '<p>No bank details available.</p>';
            }

            html = `
                <h5>Bank Account Details</h5>
                ${bankList}
                <p style="font-size:0.75rem; margin-top:10px; color:#c0392b;">* Please share a screenshot of the deposit slip via WhatsApp.</p>
            `;

        } else if (method === "Online Card Payment") {
            let gatewayList = '';
            if (paymentConfig.gateways && paymentConfig.gateways.length > 0) {
                gatewayList = paymentConfig.gateways.map(gate => `
                    <button class="bank-opt" onclick="window.redirectToBank('${gate.url}')">
                        <i class="fas fa-university" style="font-size:1.5rem; color:#27ae60;"></i>
                        <span>${gate.name}</span>
                    </button>
                 `).join('');
            } else {
                gatewayList = '<p>No payment gateways configured.</p>';
            }

            html = `
                <div style="text-align:center; padding:10px;">
                    <i class="fas fa-credit-card" style="font-size:3rem; color:#d63031; margin-bottom:10px;"></i>
                    <h5 style="margin-bottom:10px;">Select Online Gateway</h5>
                    <div class="bank-selection-grid">
                        ${gatewayList}
                    </div>
                    <p style="font-size:0.75rem; color:#666; margin-top:10px;">Secure Payment Links 🔒</p>
                </div>
            `;
        }

        paymentDetailsArea.innerHTML = html;

        // Update Checkout Button text
        if (checkoutBtn) {
            if (method === "Online Card Payment") {
                checkoutBtn.innerHTML = 'Pay Online Securely <i class="fas fa-lock"></i>';
                checkoutBtn.style.backgroundColor = "#27ae60";
            } else {
                checkoutBtn.innerHTML = 'Checkout via WhatsApp <i class="fab fa-whatsapp"></i>';
                checkoutBtn.style.backgroundColor = "var(--primary-color)";
            }
        }
    }

    // Initialize UI
    updatePaymentUI("Cash on Delivery");

    payMethods.forEach(method => {
        method.addEventListener('click', () => {
            payMethods.forEach(m => m.classList.remove('active'));
            method.classList.add('active');
            selectedPaymentMethod = method.getAttribute('data-method');
            updatePaymentUI(selectedPaymentMethod);
        });
    });

    // --- Special Request Form Logic ---
    const btnReqWhatsapp = document.getElementById('btn-req-whatsapp');
    const btnReqEmail = document.getElementById('btn-req-email');
    const reqNameInput = document.getElementById('req-treat-name');
    const reqDescInput = document.getElementById('req-treat-desc');

    if (btnReqWhatsapp) {
        btnReqWhatsapp.addEventListener('click', () => {
            const name = reqNameInput.value.trim();
            const desc = reqDescInput.value.trim();

            if (!name) {
                alert("Please enter the name of the treat you want!");
                return;
            }

            let msg = "Hi Happy Candy! 🍭\nI am looking for a special treat: \n\n * Treat Name:* " + name + " \n * Details:* " + (desc || 'Not provided');
            if (currentUser) msg += "\n\n - From: " + currentUser.name;

            const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        });
    }

    if (btnReqEmail) {
        btnReqEmail.addEventListener('click', () => {
            const name = reqNameInput.value.trim();
            const desc = reqDescInput.value.trim();

            if (!name) {
                alert("Please enter the name of the treat you want!");
                return;
            }

            const subject = `Special Treat Request: ${name}`;
            let body = `Hi Happy Candy Team,\n\nI would like to request the following item:\n\nTreat Name: ${name}\nDetails: ${desc || 'N/A'}`;
            if (currentUser) body += `\n\nCustomer: ${currentUser.name} (${currentUser.email})`;

            window.location.href = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }

    // Expose Global Helper for Bank Redirects
    window.redirectToBank = function (url) {
        if (!url) return;
        window.open(url, '_blank');
    };

    function generateOrderMessage() {
        let msg = "Hi! I would like to order the following treats: 🍭\n\n";
        let total = 0;

        cart.forEach(item => {
            const itemTotal = parsePrice(item.price) * item.quantity;
            total += itemTotal;
            msg += `- ${item.name} (x${item.quantity}) = ${formatPriceValue(itemTotal)}\n`;
        });

        msg += `\nTotal Value: ${formatPriceValue(total)}`;
        msg += `\nPayment Method: ${selectedPaymentMethod}`;

        // Add specific details
        if (selectedPaymentMethod === "Cash on Delivery") {
            const addr = document.getElementById('cus-address')?.value || "Not provided";
            msg += `\nDelivery Address: ${addr}`;
        }

        msg += `\n\nPlease let me know the status of my order!`;
        return msg;
    }

    // --- Auth Logic ---
    const authModal = document.getElementById('auth-modal');
    const authNavBtn = document.getElementById('auth-nav-btn');
    const closeAuthBtn = document.getElementById('close-auth');
    const authStatusText = document.getElementById('auth-status-text');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authFormContainer = document.getElementById('auth-form-container');
    const profileContainer = document.getElementById('profile-container');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Real Auth Logic with Password & Reset ---
    // (users, currentUser, generatedResetCode, resetEmail initialized at top)

    const forgotPassLink = document.getElementById('forgot-pass-link');
    const forgotPassSection = document.getElementById('forgot-pass-section');
    const backToLoginBtns = document.querySelectorAll('.back-to-login');
    const resetStep1 = document.getElementById('reset-step-1');
    const resetStep2 = document.getElementById('reset-step-2');
    const resetStep3 = document.getElementById('reset-step-3');

    function saveOrderToHistory(orderData) {
        if (!currentUser) return;

        let userToUpdate = users.find(u => u.email === currentUser.email);
        if (userToUpdate) {
            if (!userToUpdate.history) userToUpdate.history = [];
            userToUpdate.history.unshift({
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                items: orderData.items,
                total: orderData.total,
                payment: orderData.payment
            });

            // Sync with local storage
            localStorage.setItem('happy_candy_users', JSON.stringify(users));
            currentUser = userToUpdate;
            localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));
            updateAuthUI();
        }
    }

    function renderAdminStats() {
        const statsGrid = document.getElementById('admin-stats-grid');
        if (!statsGrid) return;

        let totalProds = 0;
        let catStats = '';

        appCategories.forEach(cat => {
            const count = (products[cat.id] || []).length;
            totalProds += count;
            catStats += `
                <div class="stat-card">
                    <h4>${cat.name}</h4>
                    <div class="val">${count}</div>
                    <p style="font-size:0.6rem; color:#999;">Total Items</p>
                </div>
            `;
        });

        statsGrid.innerHTML = `
            <div class="stat-card" style="grid-column: 1 / -1; background: #e3f2fd;">
                <h4>Total Inventory Products</h4>
                <div class="val" style="color:#1976d2;">${totalProds}</div>
            </div>
            ${catStats}
        `;
    }

    function updateAuthUI() {
        if (currentUser) {
            authStatusText.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
            document.getElementById('profile-name').textContent = currentUser.name;
            document.getElementById('profile-email').textContent = currentUser.email;

            // Update Profile Avatar
            // Update Profile Avatar
            const avatarEl = document.querySelector('.profile-avatar');
            if (avatarEl) {
                const photoSrc = currentUser.photo || `https://ui-avatars.com/api/?name=${currentUser.name.replace(/ /g, '+')}&background=random&color=fff&size=200`;
                avatarEl.innerHTML = `<img src="${photoSrc}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            }

            // Render Order History
            const historyList = document.getElementById('order-history-list');
            if (historyList) {
                if (currentUser.history && currentUser.history.length > 0) {
                    historyList.innerHTML = currentUser.history.map(order => `
                        <div class="order-card-item">
                            <div class="order-header">
                                <span><i class="far fa-calendar-alt"></i> ${order.date}</span>
                                <span><i class="far fa-clock"></i> ${order.time}</span>
                            </div>
                            <div class="order-items-summary">
                                ${order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </div>
                            <div class="order-total-mini">Total: ${formatPriceValue(order.total)}</div>
                            <div style="font-size:0.75rem; color:#666; margin-top:5px;">Method: ${order.payment}</div>
                        </div>
                    `).join('');
                } else {
                    historyList.innerHTML = '<p class="no-orders-msg">No previous orders found. Start shopping! 🍭</p>';
                }
            }

            // Admin View Check
            const adminActions = document.getElementById('admin-actions');
            if (adminActions) {
                const isAnyAdmin = currentUser.email === ADMIN_EMAIL || currentUser.isAdmin === true;
                adminActions.style.display = isAnyAdmin ? 'block' : 'none';
            }

            toggleAdminTabs(); // Apply restricted tabs visibility

            authFormContainer.style.display = 'none';
            profileContainer.style.display = 'block';
        } else {
            authStatusText.textContent = 'Login';
            authFormContainer.style.display = 'block';
            profileContainer.style.display = 'none';
            // Ensure restricted tabs are hidden on logout or guest state
            toggleAdminTabs();
            // Ensure login form is active when no user is logged in
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            forgotPassSection.classList.remove('active'); // Hide forgot password section
        }
    }

    // (Duplicate toggleAdminTabs removed)

    updateAuthUI();


    function renderGalleryCategories() {
        const galleryGrid = document.querySelector('.gallery-grid');
        if (!galleryGrid) return;

        galleryGrid.innerHTML = appCategories.map(cat => `
            <div class="gallery-item" data-category="${cat.id}">
                <div class="icon-box" style="background: ${cat.color || '#f0f0f0'};">
                    <i class="fas ${cat.icon || 'fa-candy-cane'}" style="color: ${cat.iconColor || '#888'};"></i>
                </div>
                <h3 data-i18n="cat_${cat.id}">${translations[currentLang]['cat_' + cat.id] || cat.name}</h3>
            </div>
        `).join('');

        // Re-attach listeners
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                renderProducts(item.getAttribute('data-category'));

                // Scroll to display
                document.getElementById('product-display').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function renderAdminCategoryOptions() {
        const select = document.getElementById('admin-p-cat');
        if (!select) return;
        select.innerHTML = appCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }

    function renderAdminCategoryList() {
        const list = document.getElementById('admin-category-list');
        if (!list) return;
        list.innerHTML = appCategories.map(cat => `
                <div class="admin-list-item-info">
                    <strong>${cat.name}</strong>
                    <span>ID: ${cat.id}</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-edit-item edit-cat" data-id="${cat.id}" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-item delete-cat" data-id="${cat.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('') || '<p style="text-align:center; padding:20px; color:#999;">No custom categories yet.</p>';

        // Edit Category Listeners
        list.querySelectorAll('.edit-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const cat = appCategories.find(c => c.id === id);
                if (cat) {
                    document.getElementById('new-cat-id').value = cat.id;
                    document.getElementById('new-cat-id').readOnly = true; // Lock ID
                    document.getElementById('new-cat-name').value = cat.name;

                    const addBtn = document.getElementById('btn-add-category');
                    addBtn.innerHTML = 'Update Category <i class="fas fa-sync-alt"></i>';
                    addBtn.setAttribute('data-mode', 'update');
                }
            });
        });

        list.querySelectorAll('.delete-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Delete Category "${id}" and all its products?`)) {
                    appCategories = appCategories.filter(c => c.id !== id);
                    delete products[id];
                    delete productsJP[id];
                    saveInventory();
                    renderAdminCategoryList();
                }
            });
        });
    }

    function renderAdminProductList() {
        const list = document.getElementById('admin-product-list');
        if (!list) return;

        let allProductsHtml = '';
        appCategories.forEach(cat => {
            const catProducts = products[cat.id] || [];
            if (catProducts.length > 0) {
                allProductsHtml += `<div style="padding:10px; background:#f0f0f0; border-radius:10px; margin:10px 0; font-weight:bold;">${cat.name}</div>`;
                catProducts.forEach(p => {
                    const lowStock = (p.stock || 15) <= 5;
                    allProductsHtml += `
                        <div class="admin-list-item" style="${lowStock ? 'border-left: 5px solid #ff4757; background:#fff5f5;' : ''}">
                            <div class="admin-list-item-info">
                                <strong>${p.name}</strong>
                                <span>${p.price} ${lowStock ? '<b class="stock-low-blink" style="font-size:0.7rem;">(LOW STOCK ALERT)</b>' : ''}</span>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span style="font-size:0.8rem; color:${lowStock ? '#ff0000' : '#666'}; font-weight:${lowStock ? '800' : '400'};">Stock: ${p.stock || 15}</span>
                                <button class="btn-edit-item edit-prod" data-cat="${cat.id}" data-pid="${p.id}" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button class="btn-delete-item delete-prod" data-cat="${cat.id}" data-pid="${p.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                });
            }
        });

        list.innerHTML = allProductsHtml || '<p style="text-align:center; padding:20px; color:#999;">No products found.</p>';

        // Edit Listeners
        list.querySelectorAll('.edit-prod').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.getAttribute('data-cat');
                const pId = btn.getAttribute('data-pid');
                const product = products[catId].find(p => p.id.toString() === pId.toString());
                const productJP = productsJP[catId] ? productsJP[catId].find(p => p.id.toString() === pId.toString()) : null;

                if (product) {
                    if (appSettings.isLockdownMode && !currentUser.isSuperAdmin) {
                        alert("🚨 SECURITY LOCKDOWN ACTIVE\nOnly Super Admin can edit items right now.");
                        return;
                    }
                    // Switch to Add/Edit Tab
                    document.querySelector('.admin-tab[data-tab="add-p-tab"]').click();

                    // Populate Form
                    document.getElementById('admin-p-cat').value = catId;
                    document.getElementById('admin-p-name').value = product.name;
                    document.getElementById('admin-p-price').value = product.price;
                    document.getElementById('admin-p-desc').value = product.desc || "";
                    document.getElementById('admin-p-img').value = product.img || "";
                    const fileInput = document.getElementById('admin-p-img-file');
                    if (fileInput) fileInput.value = ''; // Clear file input on edit load

                    document.getElementById('admin-p-name-jp').value = productJP ? productJP.name : "";
                    document.getElementById('admin-p-desc-jp').value = productJP ? productJP.desc : "";

                    // Set Hidden ID to track edit mode
                    // We need to inject this input into HTML if not exists, but for now assuming I will add it.
                    let hiddenInput = document.getElementById('admin-p-id-hidden');
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.id = 'admin-p-id-hidden';
                        document.getElementById('add-product-form').appendChild(hiddenInput);
                    }
                    hiddenInput.value = product.id;

                    document.querySelector('#add-product-form button[type="submit"]').innerHTML = 'Update Product <i class="fas fa-sync-alt"></i>';
                }
            });
        });

        list.querySelectorAll('.delete-prod').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.getAttribute('data-cat');
                const pId = btn.getAttribute('data-pid');
                if (confirm("Delete this product?")) {
                    const pName = products[catId].find(p => p.id.toString() === pId.toString())?.name || "Unknown";
                    products[catId] = products[catId].filter(p => p.id.toString() !== pId.toString());
                    if (productsJP[catId]) {
                        productsJP[catId] = productsJP[catId].filter(p => p.id.toString() !== pId.toString());
                    }
                    saveInventory();
                    recordActionActivity('DELETE_PRODUCT', `Deleted item: "${pName}" from ${catId}`);
                    renderAdminProductList();
                }
            });
        });
    }

    // Initialize UI
    renderGalleryCategories();
    renderAdminCategoryOptions();

    // --- Admin Logic: Manage Products ---
    const adminModal = document.getElementById('admin-modal');
    const manageProductsBtn = document.getElementById('manage-products-btn');
    const closeAdminModal = document.getElementById('close-admin-modal');
    const addProductForm = document.getElementById('add-product-form');

    // Tab Switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(target).style.display = 'block';

            if (target === 'manage-cat-tab') renderAdminCategoryList();
            if (target === 'all-p-tab') renderAdminProductList();
            if (target === 'add-p-tab') renderAdminCategoryOptions();
            if (target === 'payment-tab' && typeof renderAdminPaymentLists === 'function') renderAdminPaymentLists();
            if (target === 'reviews-tab') renderAdminReviews();
        });
    });

    // Add/Update Category Logic
    const btnAddCat = document.getElementById('btn-add-category');
    if (btnAddCat) {
        btnAddCat.addEventListener('click', () => {
            const id = document.getElementById('new-cat-id').value.trim().toLowerCase();
            const name = document.getElementById('new-cat-name').value.trim();
            const mode = btnAddCat.getAttribute('data-mode');

            if (!id || !name) return alert("Please fill ID and Name");

            if (mode === 'update') {
                // Update Logic
                const cat = appCategories.find(c => c.id === id);
                if (cat) {
                    cat.name = name;
                    saveInventory();
                    renderAdminCategoryList();
                    alert("Category Updated! ✅");

                    // Reset UI
                    document.getElementById('new-cat-id').value = '';
                    document.getElementById('new-cat-name').value = '';
                    document.getElementById('new-cat-id').readOnly = false;
                    btnAddCat.innerHTML = 'Add Category <i class="fas fa-plus"></i>';
                    btnAddCat.removeAttribute('data-mode');
                }
            } else {
                // Add Logic
                if (appCategories.find(c => c.id === id)) return alert("Category ID already exists");

                appCategories.push({ id, name, icon: 'fa-box-open', color: '#eee', iconColor: '#999' });
                if (!products[id]) products[id] = [];
                if (!productsJP[id]) productsJP[id] = [];

                saveInventory();
                recordActionActivity('ADD_CATEGORY', `Created new Category: "${name}"`);
                renderAdminCategoryList();
                document.getElementById('new-cat-id').value = '';
                document.getElementById('new-cat-name').value = '';
                alert("Category Added! ✅");
            }
        });
    }

    if (manageProductsBtn) {
        manageProductsBtn.addEventListener('click', () => {
            // Create hidden ID input for editing if not exists
            let hiddenInput = document.getElementById('admin-p-id-hidden');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'admin-p-id-hidden';
                if (addProductForm) addProductForm.appendChild(hiddenInput);
            }

            // Ensure Tabs visibility is current
            if (typeof toggleAdminTabs === 'function') toggleAdminTabs();
            else console.error("toggleAdminTabs missing!");

            // Populate About Us immediately
            let aboutConfig = JSON.parse(localStorage.getItem('happy_candy_about')) || {};
            const descField = document.getElementById('about-us-desc');
            const ownerNameField = document.getElementById('about-owner-name');
            const ownerRoleField = document.getElementById('about-owner-role');
            if (descField && aboutConfig.desc) descField.value = aboutConfig.desc;
            if (ownerNameField && aboutConfig.ownerName) ownerNameField.value = aboutConfig.ownerName;
            if (ownerRoleField && aboutConfig.ownerRole) ownerRoleField.value = aboutConfig.ownerRole;

            // Clear owner file input
            const ownerFile = document.getElementById('about-owner-img-file');
            if (ownerFile) ownerFile.value = '';

            adminModal.classList.add('active');
            renderAdminCategoryOptions(); // Refresh select list

            // If Super Admin, fetch logs
            if (currentUser && currentUser.isSuperAdmin) {
                fetchLoginActivity();
            }

            // Sync Settings UI
            const jpToggle = document.getElementById('toggle-jp-lang');
            if (jpToggle) jpToggle.checked = appSettings.isJapaneseEnabled;
            const voiceToggle = document.getElementById('toggle-voice-greeting');
            if (voiceToggle) voiceToggle.checked = appSettings.isVoiceEnabled;

            // Panic Protocols Sync
            const lockdownToggle = document.getElementById('toggle-lockdown-mode');
            if (lockdownToggle) lockdownToggle.checked = appSettings.isLockdownMode || false;

            // Render Staff List
            renderStaffList();

            // Sync Premium Toggles
            const pubToggle = document.getElementById('toggle-site-published');
            if (pubToggle) pubToggle.checked = appSettings.isSitePublished !== false;

            document.getElementById('toggle-dark-mode-feature').checked = appSettings.isDarkModeFeatureEnabled !== false;
            document.getElementById('toggle-custom-cursor').checked = appSettings.isCustomCursorEnabled !== false;
            document.getElementById('toggle-newsletter').checked = appSettings.isNewsletterEnabled !== false;
            document.getElementById('toggle-faq').checked = appSettings.isFaqEnabled !== false;
            document.getElementById('toggle-reviews').checked = appSettings.isReviewsEnabled !== false;
            document.getElementById('toggle-social-bar').checked = appSettings.isSocialBarEnabled !== false;
            document.getElementById('toggle-exit-popup').checked = appSettings.isExitPopupEnabled !== false;
            document.getElementById('toggle-sales-alerts').checked = appSettings.isSalesAlertEnabled !== false;

            const festivalSelect = document.getElementById('seasonal-theme-select');
            if (festivalSelect) festivalSelect.value = appSettings.activeFestival || 'none';

            // Manage Orders Tab Visibility (All Admins)
            const ordersTab = document.querySelector('.admin-tab[data-tab="manage-orders-tab"]');
            if (ordersTab) {
                ordersTab.style.display = 'block'; // Visible to all staff/admins
                // Add click listener if not already handled by generic tab logic, 
                // but generic logic handles display. We need to trigger fetch on click.
                ordersTab.addEventListener('click', () => {
                    renderAdminOrders();
                });
            }
        });
    }

    // Toggle Japanese Language Settings
    const jpToggle = document.getElementById('toggle-jp-lang');
    if (jpToggle) {
        jpToggle.addEventListener('change', (e) => {
            appSettings.isJapaneseEnabled = e.target.checked;
            applySettings();
            saveDataToFirebase();
            recordActionActivity('SETTINGS_CHANGE', `Japanese Language ${appSettings.isJapaneseEnabled ? 'Enabled' : 'Disabled'}`);
        });
    }

    const voiceToggle = document.getElementById('toggle-voice-greeting');
    if (voiceToggle) {
        voiceToggle.addEventListener('change', (e) => {
            appSettings.isVoiceEnabled = e.target.checked;
            saveSettings();
            recordActionActivity('SETTINGS_CHANGE', `Voice Greeting ${appSettings.isVoiceEnabled ? 'Enabled' : 'Disabled'}`);
        });
    }

    // Helper to save settings
    function saveSettings() {
        localStorage.setItem('happy_candy_settings', JSON.stringify(appSettings));
        saveDataToFirebase();
        applySettings();
    }

    // New Super Admin Toggles Listeners
    const premiumToggles = [
        { id: 'toggle-dark-mode-feature', key: 'isDarkModeFeatureEnabled' },
        { id: 'toggle-custom-cursor', key: 'isCustomCursorEnabled' },
        { id: 'toggle-newsletter', key: 'isNewsletterEnabled' },
        { id: 'toggle-faq', key: 'isFaqEnabled' },
        { id: 'toggle-reviews', key: 'isReviewsEnabled' },
        { id: 'toggle-social-bar', key: 'isSocialBarEnabled' },
        { id: 'toggle-exit-popup', key: 'isExitPopupEnabled' },
        { id: 'toggle-sales-alerts', key: 'isSalesAlertEnabled' }
    ];

    premiumToggles.forEach(t => {
        const el = document.getElementById(t.id);
        if (el) {
            el.addEventListener('change', (e) => {
                appSettings[t.key] = e.target.checked;
                saveSettings();
                recordActionActivity('SETTINGS_CHANGE', `${t.key} set to ${e.target.checked}`);
            });
        }
    });

    const festivalSelect = document.getElementById('seasonal-theme-select');
    if (festivalSelect) {
        festivalSelect.addEventListener('change', (e) => {
            appSettings.activeFestival = e.target.value;
            saveSettings();
            recordActionActivity('SETTINGS_CHANGE', `Festival Theme changed to: ${e.target.value}`);
        });
    }

    // --- Panic Protocol Logic ---
    const lockdownToggle = document.getElementById('toggle-lockdown-mode');
    if (lockdownToggle) {
        lockdownToggle.addEventListener('change', (e) => {
            appSettings.isLockdownMode = e.target.checked;
            saveSettings();
            recordActionActivity('SECURITY_ALERT', `Lockdown Mode ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
            if (e.target.checked) alert("🚨 LOCKDOWN ENABLED\nStaff/Normal Admins can no longer make content changes.");
        });
    }

    const pubToggle = document.getElementById('toggle-site-published');
    if (pubToggle) {
        pubToggle.addEventListener('change', (e) => {
            appSettings.isSitePublished = e.target.checked;
            saveSettings();
            recordActionActivity('Site Status', `Website ${e.target.checked ? 'PUBLISHED' : 'UNPUBLISHED'}`);
            if (!e.target.checked) alert("⚠️ Site is now UNPUBLISHED.\nVisitors will see the loading/maintenance screen.");
        });
    }

    // Maintenance Login Logic
    const maintBtn = document.getElementById('maintenance-unlock-btn');
    if (maintBtn) {
        maintBtn.addEventListener('click', () => {
            const pass = document.getElementById('maintenance-pass').value;
            // Check against Super Admin Pass
            if (pass === SUPER_ADMIN_PASS) {
                sessionStorage.setItem('super_admin_unlocked', 'true');
                document.getElementById('site-loader').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('site-loader').style.display = 'none';
                }, 500);
            } else {
                alert("Access Denied! Incorrect Password.");
            }
        });
    }

    function renderStaffList() {
        const listContainer = document.getElementById('staff-list-container');
        if (!listContainer) return;

        // Filter out the Super Admin (YOU)
        const staff = users.filter(u => u.isAdmin === true && u.email !== ADMIN_EMAIL);

        if (staff.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#999; font-size:0.85rem;">No other staff members found.</p>';
            return;
        }

        listContainer.innerHTML = staff.map((s, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:8px 12px; margin-bottom:5px; border-radius:5px; border:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${s.photo || 'https://ui-avatars.com/api/?name=' + s.name.replace(/ /g, '+') + '&background=random'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ddd;">
                    <div>
                        <strong style="display:block; font-size:0.9rem;">${s.name}</strong>
                        <span style="font-size:0.75rem; color:#666;">${s.email}</span>
                    </div>
                </div>
                <button class="btn-revoke-staff" data-email="${s.email}" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer;">
                    REVOKE <i class="fas fa-ban"></i>
                </button>
            </div>
        `).join('');

        listContainer.querySelectorAll('.btn-revoke-staff').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-email');
                if (confirm(`Are you sure you want to remove ADMIN access for ${email}?`)) {
                    // Update user record
                    const uIndex = users.findIndex(u => u.email === email);
                    if (uIndex > -1) {
                        users[uIndex].isAdmin = false;
                        localStorage.setItem('happy_candy_users', JSON.stringify(users));
                        renderStaffList();
                        alert(`${email} has been removed from staff.`);
                    }
                }
            });
        });
    }

    // --- Theme Switching ---
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            setTheme(theme);
            appSettings.activeTheme = theme;
            saveDataToFirebase();
        });
    });

    function setTheme(theme) {
        document.body.className = document.body.className.replace(/\btheme-\S+/g, '');
        if (theme !== 'pink') document.body.classList.add(`theme-${theme}`);
        document.querySelectorAll('.theme-dot').forEach(d => {
            d.classList.toggle('active', d.getAttribute('data-theme') === theme);
        });
    }
    if (appSettings.activeTheme) setTheme(appSettings.activeTheme);

    function applySettings() {
        const jpBtn = document.querySelector('.lang-btn[data-lang="jp"]');
        if (jpBtn) {
            jpBtn.style.display = appSettings.isJapaneseEnabled ? 'inline-block' : 'none';
            if (!appSettings.isJapaneseEnabled && currentLang === 'jp') {
                currentLang = 'en';
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.lang-btn[data-lang="en"]').classList.add('active');
                setLanguage('en');
            }
        }

        // Apply Premium Feature Visibility
        const dmBtn = document.getElementById('dark-mode-toggle');
        if (dmBtn) dmBtn.style.display = appSettings.isDarkModeFeatureEnabled !== false ? 'block' : 'none';

        const newsSec = document.querySelector('.newsletter-section');
        if (newsSec) newsSec.style.display = appSettings.isNewsletterEnabled !== false ? 'block' : 'none';

        const faqSec = document.querySelector('.faq-section');
        if (faqSec) faqSec.style.display = appSettings.isFaqEnabled !== false ? 'block' : 'none';

        const reviewsSec = document.querySelector('.reviews-section');
        if (reviewsSec) reviewsSec.style.display = appSettings.isReviewsEnabled !== false ? 'block' : 'none';

        const socialBar = document.querySelector('.floating-social-bar');
        if (socialBar) socialBar.style.display = appSettings.isSocialBarEnabled !== false ? 'flex' : 'none';

        // Custom Cursor Toggle
        if (appSettings.isCustomCursorEnabled === false) {
            document.body.style.cursor = 'default';
            document.querySelectorAll('button, a, .nav-item').forEach(el => el.style.cursor = 'pointer');
        } else {
            // Re-applying handled by CSS by default, but we can force it or let it be.
            // Actually, we'll just add/remove a class to body for cleaner control
            document.body.classList.toggle('custom-cursor-disabled', !appSettings.isCustomCursorEnabled);
        }

        // Apply Seasonal Theme Class
        document.body.classList.remove('season-avurudu', 'season-vesak', 'season-christmas');
        if (appSettings.activeFestival && appSettings.activeFestival !== 'none') {
            document.body.classList.add(`season-${appSettings.activeFestival}`);

            // Special Effects injection
            if (appSettings.activeFestival === 'christmas') {
                startSnowing();
            } else {
                stopSnowing();
            }
        } else {
            stopSnowing();
        }
    }

    let snowInterval = null;
    function startSnowing() {
        if (snowInterval) return;
        snowInterval = setInterval(() => {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.innerHTML = '❄️';
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.opacity = Math.random();
            flake.style.fontSize = (Math.random() * 20 + 10) + 'px';
            flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            document.body.appendChild(flake);
            setTimeout(() => flake.remove(), 5000);
        }, 300);
    }
    function stopSnowing() {
        if (snowInterval) {
            clearInterval(snowInterval);
            snowInterval = null;
        }
    }

    applySettings(); // Initial call

    const refreshActivityBtn = document.getElementById('refresh-activity-btn');
    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener('click', () => {
            fetchLoginActivity();
        });
    }

    function recordActionActivity(type, details) {
        if (!currentUser || currentUser.isSuperAdmin) return; // Only log normal admin actions

        const logRef = db.collection('admin_activity');
        logRef.add({
            email: currentUser.email,
            type: type, // 'LOGIN', 'ADD_PRODUCT', 'EDIT_PRODUCT', 'DELETE_PRODUCT', etc.
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            details: details,
            device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop"
        }).then(() => {
            console.log(`Action recorded: ${type} ✅`);
        });
    }

    function recordLoginActivity(email) {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        const screen = `${window.screen.width}x${window.screen.height}`;

        // Basic detection
        let device = "Desktop / PC";
        if (/Mobi|Android|iPhone/i.test(ua)) device = "Mobile Device";
        if (/Tablet|iPad/i.test(ua)) device = "Tablet";

        const logRef = db.collection('admin_activity');
        logRef.add({
            email: email,
            type: 'LOGIN',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            device: device,
            platform: platform,
            screen: screen,
            details: ua.split(')')[0] + ')' // Shortened UserAgent
        }).then(() => {
            console.log("Login Activity Recorded 🖥️✅");
        });
    }

    function fetchLoginActivity() {
        const list = document.getElementById('login-activity-list');
        if (!list) return;

        list.innerHTML = '<p style="text-align:center; padding:10px; color:#666;">Syncing logs... 🔄</p>';

        db.collection('admin_activity')
            .orderBy('timestamp', 'desc')
            .limit(15)
            .get()
            .then((querySnapshot) => {
                let html = '';
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const date = data.timestamp ? data.timestamp.toDate() : new Date();
                    const timeStr = date.toLocaleString();
                    const type = data.type || 'LOGIN';

                    let bg = '#eee';
                    let icon = 'fa-info-circle';
                    let color = '#2d3436';
                    let label = 'Action';

                    if (type === 'LOGIN') { bg = '#e3f2fd'; icon = 'fa-sign-in-alt'; color = '#1976d2'; label = 'Admin Login'; }
                    else if (type.includes('ADD')) { bg = '#e8f5e9'; icon = 'fa-plus-circle'; color = '#2e7d32'; label = 'Item Added'; }
                    else if (type.includes('EDIT')) { bg = '#fff3e0'; icon = 'fa-edit'; color = '#ef6c00'; label = 'Item Updated'; }
                    else if (type.includes('DELETE')) { bg = '#ffeeb2'; icon = 'fa-trash-alt'; color = '#c62828'; label = 'Item Deleted'; }

                    html += `
                        <div style="padding:10px; border-bottom:1px solid #eee; font-size:0.85rem; background:${bg}; margin-bottom:2px; border-radius:5px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="font-weight:bold; color:${color};"><i class="fas ${icon}"></i> ${label}</span>
                                <span style="color:#666; font-size:0.75rem;">${timeStr}</span>
                            </div>
                            <div style="color:#2d3436; font-weight:500;">
                                ${data.details}
                            </div>
                            <div style="color:#636e72; font-size:0.75rem; margin-top:3px; display:flex; gap:10px;">
                                <span><i class="fas fa-desktop"></i> ${data.device || 'N/A'}</span>
                                <span><i class="fas fa-envelope"></i> ${data.email}</span>
                            </div>
                        </div>
                    `;
                });
                list.innerHTML = html || '<p style="text-align:center; padding:20px; color:#999;">No activity recorded yet.</p>';
            }).catch(err => {
                console.error("Error fetching logs:", err);
                list.innerHTML = '<p style="color:red; text-align:center;">Failed to load logs.</p>';
            });
    }

    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', () => {
            adminModal.classList.remove('active');
        });
    }

    // Helper: Read File to Base64
    function readFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Handle File Upload if selected
            const fileInput = document.getElementById('admin-p-img-file');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                try {
                    // Size validation (Max 700KB recommended)
                    if (fileInput.files[0].size > 700 * 1024) {
                        if (!confirm("⚠️ Large Image Detected (>700KB)\n\nUploading large images may fill up your local storage quickly and prevent saving.\n\nAre you sure you want to use this image?")) {
                            return;
                        }
                    }
                    const base64 = await readFileToBase64(fileInput.files[0]);
                    document.getElementById('admin-p-img').value = base64;
                } catch (err) {
                    console.error("Error reading file:", err);
                    alert("Failed to read image file! ❌");
                    return;
                }
            }

            if (appSettings.isLockdownMode && !currentUser.isSuperAdmin) {
                alert("🚨 SECURITY LOCKDOWN ACTIVE\nYou cannot make changes right now. Contact the Owner.");
                return;
            }

            const cat = document.getElementById('admin-p-cat').value;
            const price = document.getElementById('admin-p-price').value;
            const name = document.getElementById('admin-p-name').value;
            const desc = document.getElementById('admin-p-desc').value;
            const img = document.getElementById('admin-p-img').value || "https://ui-avatars.com/api/?name=Treat&background=ff6b81&color=fff";

            const nameJp = document.getElementById('admin-p-name-jp').value;
            const descJp = document.getElementById('admin-p-desc-jp').value;

            // Handle Edit vs Add
            const existingId = document.getElementById('admin-p-id-hidden').value;

            if (existingId) {
                // UPDATE existing product
                let found = false;
                for (let c in products) {
                    const pIndex = products[c].findIndex(p => p.id.toString() === existingId);
                    if (pIndex !== -1) {
                        // Remove from old category if changed
                        if (c !== cat) {
                            products[c].splice(pIndex, 1);
                            if (!products[cat]) products[cat] = [];
                            products[cat].push({ id: existingId, name, price, img, desc, icon: "fa-candy-cane" });
                        } else {
                            // Update in place
                            products[cat][pIndex] = { id: existingId, name, price, img, desc, icon: "fa-candy-cane" };
                        }
                        found = true;
                        break;
                    }
                }

                if (found) {
                    recordActionActivity('EDIT_PRODUCT', `Updated item: "${name}" (${cat})`);
                    // Update JP if exists
                    for (let c in productsJP) {
                        const pIndex = productsJP[c].findIndex(p => p.id.toString() === existingId);
                        if (pIndex !== -1) {
                            if (c !== cat) {
                                productsJP[c].splice(pIndex, 1);
                                if (!productsJP[cat]) productsJP[cat] = [];
                                productsJP[cat].push({ id: existingId, name: nameJp || name, price, img, desc: descJp || "", icon: "fa-candy-cane" });
                            } else {
                                productsJP[cat][pIndex] = { id: existingId, name: nameJp || name, price, img, desc: descJp || "", icon: "fa-candy-cane" };
                            }
                        }
                    }
                    alert("Product Updated Successfully! ✅");
                }
            } else {
                // CREATE NEW product
                const newId = Date.now();

                // Update EN/SI/TA Inventory
                if (!products[cat]) products[cat] = [];
                products[cat].push({ id: newId, name, price, img, desc, icon: "fa-candy-cane" });

                // Update JP Inventory (if provided)
                if (nameJp) {
                    if (!productsJP[cat]) productsJP[cat] = [];
                    productsJP[cat].push({
                        id: newId,
                        name: nameJp,
                        price: price,
                        img,
                        desc: descJp || "",
                        icon: "fa-candy-cane"
                    });
                }
                recordActionActivity('ADD_PRODUCT', `Added new item: "${name}" in ${cat}`);
                alert("Success! The new treat has been added to the shop catalog. 🍭");
            }

            saveInventory();
            if (addProductForm) addProductForm.reset();
            document.getElementById('admin-p-id-hidden').value = ''; // Clear hidden ID
            const submitBtn = document.querySelector('#add-product-form button[type="submit"]');
            if (submitBtn) submitBtn.innerHTML = 'Save Product <i class="fas fa-save"></i>';

            // Re-render gallery if currently showing that category
            const activeCatItem = document.querySelector('.gallery-item.active');
            if (activeCatItem && activeCatItem.getAttribute('data-category') === cat) {
                renderProducts(cat);
            }
        });
    }

    // --- Big Sale Admin Logic ---
    const bigSaleForm = document.getElementById('big-sale-form');
    if (bigSaleForm) {
        // Pre-fill form
        document.getElementById('bs-active').checked = bigSaleConfig.active;
        document.getElementById('bs-title').value = bigSaleConfig.title;
        document.getElementById('bs-name').value = bigSaleConfig.name;
        document.getElementById('bs-price').value = bigSaleConfig.price;
        document.getElementById('bs-note').value = bigSaleConfig.note;
        document.getElementById('bs-img').value = bigSaleConfig.img || "";

        bigSaleForm.addEventListener('submit', (e) => {
            e.preventDefault();

            bigSaleConfig = {
                active: document.getElementById('bs-active').checked,
                title: document.getElementById('bs-title').value,
                name: document.getElementById('bs-name').value,
                price: document.getElementById('bs-price').value,
                note: document.getElementById('bs-note').value,
                img: document.getElementById('bs-img').value
            };

            localStorage.setItem('happy_candy_big_sale', JSON.stringify(bigSaleConfig));
            alert("Big Sale Settings Updated! 🍭");
            // adminModal.classList.remove('active');

            // Refresh UI immediately (reload page to show splash again or just update text)
            updateBigSaleUI();
        });
    }

    // --- Homepage Banner Admin Logic ---
    const homeBannerForm = document.getElementById('hero-banner-form');
    if (homeBannerForm) {
        // Pre-fill
        document.getElementById('hero-active').checked = homeBannerConfig.active !== false; // Default true
        document.getElementById('hero-title').value = homeBannerConfig.title;
        document.getElementById('hero-badge').value = homeBannerConfig.badge;
        document.getElementById('hero-f1-title').value = homeBannerConfig.f1Title || "Combo Packs";
        document.getElementById('hero-f1-desc').value = homeBannerConfig.f1Desc || "Up to 30% OFF!";
        document.getElementById('hero-f2-title').value = homeBannerConfig.f2Title || "Fast Delivery";
        document.getElementById('hero-f2-desc').value = homeBannerConfig.f2Desc || "Free on all orders";
        document.getElementById('hero-f3-title').value = homeBannerConfig.f3Title || "Best Quality";
        document.getElementById('hero-f3-desc').value = homeBannerConfig.f3Desc || "International Standards";
        document.getElementById('hero-g1').value = homeBannerConfig.g1 || "#ff9f43";
        document.getElementById('hero-g2').value = homeBannerConfig.g2 || "#ff6b6b";

        homeBannerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            homeBannerConfig = {
                active: document.getElementById('hero-active').checked,
                title: document.getElementById('hero-title').value || "BIG SELLING! 🍭",
                badge: document.getElementById('hero-badge').value || "HOT DEALS",
                f1Title: document.getElementById('hero-f1-title').value,
                f1Desc: document.getElementById('hero-f1-desc').value,
                f2Title: document.getElementById('hero-f2-title').value,
                f2Desc: document.getElementById('hero-f2-desc').value,
                f3Title: document.getElementById('hero-f3-title').value,
                f3Desc: document.getElementById('hero-f3-desc').value,
                g1: document.getElementById('hero-g1').value,
                g2: document.getElementById('hero-g2').value
            };

            localStorage.setItem('happy_candy_home_banner', JSON.stringify(homeBannerConfig));
            saveInventory();
            renderHomeBanner();
            alert("Homepage Banner Features Updated! 🏠");
        });
    }

    // --- Promo Badge Admin Logic ---
    const promoForm = document.getElementById('promo-form');
    if (promoForm) {
        // Pre-fill
        document.getElementById('promo-active').checked = promoConfig.active;
        document.getElementById('promo-l1').value = promoConfig.l1;
        document.getElementById('promo-l2').value = promoConfig.l2;
        document.getElementById('promo-l3').value = promoConfig.l3;

        promoForm.addEventListener('submit', (e) => {
            e.preventDefault();

            promoConfig = {
                active: document.getElementById('promo-active').checked,
                l1: document.getElementById('promo-l1').value,
                l2: document.getElementById('promo-l2').value,
                l3: document.getElementById('promo-l3').value
            };

            saveInventory(); // Saves to Cloud & Local
            alert("Special Offer Updated! 🎁");
            updatePromoBadgeUI();
        });
    }

    // --- Hot Deals Admin Logic ---
    const hotDealsForm = document.getElementById('hot-deals-form');
    if (hotDealsForm) {
        // Pre-fill
        document.getElementById('hd-active').checked = hotDealsConfig.active;
        document.getElementById('hd-text').value = hotDealsConfig.text;
        document.getElementById('hd-color').value = hotDealsConfig.bgColor;
        document.getElementById('hd-color-text').value = hotDealsConfig.bgColor;
        document.getElementById('hd-text-color').value = hotDealsConfig.textColor;

        // Color Picker Sync
        document.getElementById('hd-color').addEventListener('input', (e) => {
            document.getElementById('hd-color-text').value = e.target.value;
        });
        document.getElementById('hd-color-text').addEventListener('input', (e) => {
            document.getElementById('hd-color').value = e.target.value;
        });

        hotDealsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            hotDealsConfig = {
                active: document.getElementById('hd-active').checked,
                text: document.getElementById('hd-text').value,
                bgColor: document.getElementById('hd-color').value,
                textColor: document.getElementById('hd-text-color').value
            };

            // Explicitly save to LocalStorage to ensure persistence
            localStorage.setItem('happy_candy_hot_deals', JSON.stringify(hotDealsConfig));

            saveInventory();
            renderHotDealsBanner();
            alert(`Hot Deals Banner ${hotDealsConfig.active ? 'ACTIVATED' : 'DEACTIVATED'}! 🔥`);
        });
    }

    // --- Reviews Admin Logic ---
    const btnAddReview = document.getElementById('btn-add-review');
    if (btnAddReview) {
        btnAddReview.addEventListener('click', () => {
            const name = document.getElementById('new-review-name').value;
            const text = document.getElementById('new-review-text').value;
            const stars = document.getElementById('new-review-stars').value;

            if (!name || !text) {
                alert("Please fill in Name and Review Text!");
                return;
            }

            appReviews.push({ name, text, stars: parseInt(stars) });
            localStorage.setItem('happy_candy_reviews', JSON.stringify(appReviews));
            saveDataToFirebase(); // Sync to Firebase

            alert("Review Added! ⭐");
            document.getElementById('new-review-name').value = '';
            document.getElementById('new-review-text').value = '';

            renderAdminReviews();
            renderReviews(); // Update frontend immediately
        });
    }

    function renderAdminReviews() {
        const list = document.getElementById('admin-reviews-list');
        if (!list) return;
        list.innerHTML = '';

        appReviews.forEach((r, index) => {
            const div = document.createElement('div');
            div.className = 'admin-order-item'; // Reuse styles
            div.innerHTML = `
                <div>
                    <strong>${r.name}</strong> (${r.stars}⭐)<br>
                    <small>${r.text}</small>
                </div>
                <button onclick="deleteReview(${index})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(div);
        });
    }
    window.deleteReview = function (index) {
        if (confirm('Delete this review?')) {
            appReviews.splice(index, 1);
            localStorage.setItem('happy_candy_reviews', JSON.stringify(appReviews));
            saveDataToFirebase(); // Sync to Firebase
            renderAdminReviews();
            renderReviews();
        }
    };

    // --- Export Data Utility ---
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const dataPackage = {
                categories: appCategories,
                products: products,
                productsJP: productsJP,
                payment: paymentConfig,
                bigSale: bigSaleConfig,
                promo: promoConfig,
                about: JSON.parse(localStorage.getItem('happy_candy_about')) || {}
            };

            const dataStr = JSON.stringify(dataPackage, null, 2);

            navigator.clipboard.writeText(dataStr).then(() => {
                alert("Shop Data Copied to Clipboard! 📋\n\nPlease send this data to the developer to make your changes permanent on all devices.");
            }).catch(err => {
                console.error('Failed to copy: ', err);
                alert("Could not copy data automatically. Please check console.");
            });
        });
    }

    // --- Payment Admin Logic ---
    const bankDetailsForm = document.getElementById('bank-details-form');
    const gatewayForm = document.getElementById('gateway-form');

    function renderAdminPaymentLists() {
        const bankList = document.getElementById('admin-bank-list');
        const gatewayList = document.getElementById('admin-gateway-list');

        if (bankList) {
            bankList.innerHTML = paymentConfig.bankDetails.map((bank, index) => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <strong>${bank.name}</strong>
                    <span style="font-size:0.8rem; color:#666;">${bank.desc}</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-edit-item edit-bank" data-index="${index}" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-item delete-bank" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('') || '<p style="color:#999;">No bank details added.</p>';

            // Edit Bank Listeners
            bankList.querySelectorAll('.edit-bank').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    const bank = paymentConfig.bankDetails[idx];
                    document.getElementById('pay-bank-name').value = bank.name;
                    document.getElementById('pay-bank-desc').value = bank.desc;

                    // Change button to Update
                    const submitBtn = bankDetailsForm.querySelector('button[type="submit"]');
                    submitBtn.innerHTML = 'Update Bank Info <i class="fas fa-sync-alt"></i>';
                    submitBtn.setAttribute('data-edit-index', idx);
                });
            });

            bankList.querySelectorAll('.delete-bank').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    if (confirm("Remove this bank detail?")) {
                        paymentConfig.bankDetails.splice(idx, 1);
                        localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
                        saveDataToFirebase(); // Sync to Firebase
                        renderAdminPaymentLists();
                        updatePaymentUI(selectedPaymentMethod);
                    }
                });
            });
        }

        // --- JP Bank List Logic ---
        const bankListJP = document.getElementById('admin-bank-jp-list');
        const bankDetailsFormJP = document.getElementById('bank-details-jp-form');

        if (bankListJP) {
            bankListJP.innerHTML = (paymentConfig.bankDetailsJP || []).map((bank, index) => `
                <div class="admin-list-item">
                    <div class="admin-list-item-info">
                        <strong>${bank.name}</strong>
                        <span style="font-size:0.8rem; color:#666;">${bank.desc}</span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-edit-item edit-bank-jp" data-index="${index}" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete-item delete-bank-jp" data-index="${index}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('') || '<p style="color:#999;">No Japanese bank details added.</p>';

            // Edit JP Listeners
            bankListJP.querySelectorAll('.edit-bank-jp').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    const bank = paymentConfig.bankDetailsJP[idx];
                    document.getElementById('pay-bank-jp-name').value = bank.name;
                    document.getElementById('pay-bank-jp-desc').value = bank.desc;

                    if (bankDetailsFormJP) {
                        const submitBtn = bankDetailsFormJP.querySelector('button[type="submit"]');
                        submitBtn.innerHTML = 'Update JP Bank Info <i class="fas fa-sync-alt"></i>';
                        submitBtn.setAttribute('data-edit-index', idx);
                    }
                });
            });

            bankListJP.querySelectorAll('.delete-bank-jp').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    if (confirm("Remove this JP bank detail?")) {
                        if (!paymentConfig.bankDetailsJP) paymentConfig.bankDetailsJP = [];
                        paymentConfig.bankDetailsJP.splice(idx, 1);
                        localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
                        saveDataToFirebase(); // Sync to Firebase
                        renderAdminPaymentLists();
                        updatePaymentUI(selectedPaymentMethod);
                    }
                });
            });
        }

        if (gatewayList) {
            gatewayList.innerHTML = paymentConfig.gateways.map((gate, index) => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <strong>${gate.name}</strong>
                    <a href="${gate.url}" target="_blank" style="font-size:0.8rem;">${gate.url}</a>
                </div>
                <button class="btn-delete-item delete-gate" data-index="${index}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('') || '<p style="color:#999;">No gateways added.</p>';

            gatewayList.querySelectorAll('.delete-gate').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-index');
                    if (confirm("Remove this gateway?")) {
                        paymentConfig.gateways.splice(idx, 1);
                        localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
                        saveDataToFirebase(); // Sync to Firebase
                        renderAdminPaymentLists();
                        updatePaymentUI(selectedPaymentMethod);
                    }
                });
            });
        }
    }

    if (bankDetailsForm) {
        bankDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('pay-bank-name').value;
            const desc = document.getElementById('pay-bank-desc').value;

            const submitBtn = bankDetailsForm.querySelector('button[type="submit"]');
            const editIdx = submitBtn.getAttribute('data-edit-index');

            if (editIdx) {
                // Update
                paymentConfig.bankDetails[editIdx] = { name, desc };
                alert("Bank Details Updated! 🏦");
                submitBtn.removeAttribute('data-edit-index');
                submitBtn.innerHTML = 'Add Bank Info';
            } else {
                paymentConfig.bankDetails.push({ name, desc });
                alert("Bank Details Added!");
            }

            localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
            saveDataToFirebase(); // Sync to Firebase
            bankDetailsForm.reset();
            renderAdminPaymentLists();
            updatePaymentUI(selectedPaymentMethod);
        });
    }

    // --- Admin Orders Logic ---
    function renderAdminOrders() {
        const list = document.getElementById('admin-orders-list');
        if (!list) return;

        list.innerHTML = '<p style="text-align:center; color:#666;">Loading orders... 🔄</p>';

        db.collection('orders').orderBy('timestamp', 'desc').limit(20).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    list.innerHTML = '<p style="text-align:center; color:#999;">No active orders found.</p>';
                    return;
                }

                let html = '';
                snapshot.forEach(doc => {
                    const order = doc.data();
                    const date = order.timestamp ? order.timestamp.toDate().toLocaleString() : 'Just now';
                    const statusColor = order.status === 'Pending' ? '#f39c12' : (order.status === 'Completed' ? '#27ae60' : '#e74c3c');

                    html += `
                        <div class="admin-list-item" style="flex-direction:column; align-items:flex-start;">
                            <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:5px;">
                                <strong>Order #${doc.id.substring(0, 8)}...</strong>
                                <span style="font-size:0.8rem; color:#666;">${date}</span>
                            </div>
                            <div style="font-size:0.9rem; color:#2d3436; margin-bottom:5px;">
                                <strong>Customer:</strong> ${order.customerName} (${order.customerEmail})
                            </div>
                            <div style="background:#f9f9f9; padding:5px; border-radius:5px; width:100%; font-size:0.85rem; margin-bottom:5px;">
                                ${order.items.map(i => `<div>${i.name} x${i.quantity}</div>`).join('')}
                            </div>
                            <div style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:5px;">
                                <strong style="color:#d63031;">Total: ${formatPriceValue(order.total)}</strong>
                                <span style="padding:2px 8px; border-radius:4px; color:white; background:${statusColor}; font-size:0.75rem;">${order.status || 'Pending'}</span>
                            </div>
                        </div>
                    `;
                });
                list.innerHTML = html;
            })
            .catch(err => {
                console.error("Error fetching orders:", err);
                list.innerHTML = '<p style="color:red; text-align:center;">Failed to load orders.</p>';
            });
    }

    // --- JP Bank Form ---
    const bankDetailsFormJP = document.getElementById('bank-details-jp-form');
    if (bankDetailsFormJP) {
        bankDetailsFormJP.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('pay-bank-jp-name').value;
            const desc = document.getElementById('pay-bank-jp-desc').value;

            if (!paymentConfig.bankDetailsJP) paymentConfig.bankDetailsJP = [];

            const submitBtn = bankDetailsFormJP.querySelector('button[type="submit"]');
            const editIdx = submitBtn.getAttribute('data-edit-index');

            if (editIdx) {
                // Update
                paymentConfig.bankDetailsJP[editIdx] = { name, desc };
                alert("JP Bank Details Updated! 🇯🇵");
                submitBtn.removeAttribute('data-edit-index');
                submitBtn.innerHTML = 'Add JP Bank Info';
            } else {
                paymentConfig.bankDetailsJP.push({ name, desc });
                alert("JP Bank Details Added! 🇯🇵");
            }

            localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
            saveDataToFirebase(); // Sync to Firebase
            bankDetailsFormJP.reset();
            renderAdminPaymentLists();
            updatePaymentUI(selectedPaymentMethod);
        });
    }

    if (gatewayForm) {
        gatewayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('pay-gate-name').value;
            const url = document.getElementById('pay-gate-url').value;

            paymentConfig.gateways.push({ name, url });
            localStorage.setItem('happy_candy_payment', JSON.stringify(paymentConfig));
            saveDataToFirebase(); // Sync to Firebase

            gatewayForm.reset();
            renderAdminPaymentLists();
            updatePaymentUI(selectedPaymentMethod);
            alert("Gateway Added!");
        });
    }

    // Initial render call when tab is clicked is handled via tab listener, but we can hook into the existing tab listener
    // or just call it implicitly when needed. Let's hook into the tab listener above.
    // Actually, I'll search for the tab listener and add the call there in a separate step if needed, 
    // or I can just expose this function globally or call it when the modal opens if I can find that logic.
    // For now, let's just leave the function definition here. I will call it when tab is switched.

    if (authNavBtn) {
        authNavBtn.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
    }

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        forgotPassSection.classList.remove('active'); // Hide forgot password section
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        forgotPassSection.classList.remove('active'); // Hide forgot password section
    });

    forgotPassLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        signupForm.classList.remove('active'); // Ensure signup is also hidden
        loginTab.classList.remove('active'); // Deactivate login tab
        signupTab.classList.remove('active'); // Deactivate signup tab
        forgotPassSection.classList.add('active');
        resetStep1.style.display = 'block';
        resetStep2.style.display = 'none';
        resetStep3.style.display = 'none';
    });

    backToLoginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            forgotPassSection.classList.remove('active');
            loginForm.classList.add('active');
            loginTab.classList.add('active'); // Activate login tab
            signupTab.classList.remove('active'); // Deactivate signup tab
        });
    });

    // --- Admin Logic: About Us Update ---
    const aboutForm = document.getElementById('about-us-form');
    if (aboutForm) {
        aboutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Handle Owner Photo Upload
            const fileInput = document.getElementById('about-owner-img-file');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                try {
                    if (fileInput.files[0].size > 1024 * 1024) { // 1MB limit for Owner Photo
                        if (!confirm("⚠️ Large Image Detected (>1MB)\n\nAre you sure?")) {
                            return;
                        }
                    }
                    const base64 = await readFileToBase64(fileInput.files[0]);
                    document.getElementById('about-owner-img').value = base64;
                } catch (err) {
                    console.error("Error reading owner photo:", err);
                    alert("Failed to read owner photo! ❌");
                    return;
                }
            }

            const desc = document.getElementById('about-us-desc').value;
            const ownerName = document.getElementById('about-owner-name').value;
            const ownerRole = document.getElementById('about-owner-role').value;
            const ownerImg = document.getElementById('about-owner-img').value;

            const aboutConfig = { desc, ownerName, ownerRole, ownerImg };
            localStorage.setItem('happy_candy_about', JSON.stringify(aboutConfig));
            saveDataToFirebase(); // Sync to Firebase
            alert("About Us section updated successfully! ℹ️");
            location.reload(); // Refresh to see changes or call a render function

        });
    }

    // --- Admin Logic: Super Admin Security ---
    const updateAdminPassBtn = document.getElementById('update-admin-pass-btn');
    if (updateAdminPassBtn) {
        updateAdminPassBtn.addEventListener('click', () => {
            const currentPassInput = document.getElementById('current-admin-pass').value;
            const newPass = document.getElementById('new-admin-access-pass').value;

            if (newPass.length < 4) {
                alert("New password is too short! (Min 4 characters)");
                return;
            }

            // Verify Authority
            if (currentUser.isSuperAdmin) {
                if (currentPassInput !== SUPER_ADMIN_PASS) {
                    alert("Incorrect Super Admin Password! ❌");
                    return;
                }
            } else {
                if (currentUser.password !== currentPassInput) {
                    alert("Current password is incorrect! ❌");
                    return;
                }
            }

            // Update Admin User Password in database
            const adminIndex = users.findIndex(u => u.email === ADMIN_EMAIL);
            if (adminIndex !== -1) {
                users[adminIndex].password = newPass;

                // If the user isn't a super admin (logged in normally), update their session pass
                if (!currentUser.isSuperAdmin) {
                    currentUser.password = newPass;
                }

                localStorage.setItem('happy_candy_users', JSON.stringify(users));
                localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));

                // Sync to Cloud
                saveDataToFirebase();

                alert("Normal Admin Password Updated & Synced to Cloud! 🔐✅");
                document.getElementById('current-admin-pass').value = '';
                document.getElementById('new-admin-access-pass').value = '';
            } else {
                alert("Admin user not found (Error).");
            }
        });
    }

    // Reset Password Flow
    document.getElementById('send-reset-code').addEventListener('click', () => {
        const email = document.getElementById('reset-email').value;
        const user = users.find(u => u.email === email);


        if (email === ADMIN_EMAIL) {
            alert("Security Alert: Admin password cannot be reset via this form. Please contact support.");
            return;
        }

        if (!user) {
            alert("Email not found! Please check your email or sign up.");
            return;
        }


        const sendBtn = document.getElementById('send-reset-code');
        sendBtn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;

        resetEmail = email;
        generatedResetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // --- EmailJS Integration ---
        // Replace 'YOUR_SERVICE_ID' and 'YOUR_TEMPLATE_ID' with your actual IDs
        const templateParams = {
            to_name: user.name,
            to_email: email,
            message: generatedResetCode
        };

        emailjs.send('service_5v7j8a8', 'template_pw_reset', templateParams)
            .then(function (response) {
                console.log('SUCCESS!', response.status, response.text);
                alert(`Security code has been sent to ${email}. Please check your inbox!`);
                resetStep1.style.display = 'none';
                resetStep2.style.display = 'block';
            }, function (error) {
                console.log('FAILED...', error);
                alert("Email delivery failed. Fallback: Your verify code is " + generatedResetCode);
                resetStep1.style.display = 'none';
                resetStep2.style.display = 'block';
            })
            .finally(() => {
                sendBtn.innerHTML = 'Send Code';
                sendBtn.disabled = false;
            });
    });

    document.getElementById('verify-reset-code').addEventListener('click', () => {
        const inputCode = document.getElementById('reset-code-input').value;
        if (inputCode === generatedResetCode) {
            resetStep2.style.display = 'none';
            resetStep3.style.display = 'block';
        } else {
            alert("Invalid code! Please try again.");
        }
    });

    document.getElementById('save-new-pass').addEventListener('click', () => {
        const newPass = document.getElementById('new-password').value;
        if (newPass.length < 4) {
            alert("Password must be at least 4 characters.");
            return;
        }

        users = users.map(u => u.email === resetEmail ? { ...u, password: newPass } : u);
        localStorage.setItem('happy_candy_users', JSON.stringify(users));

        alert("Password updated successfully! You can now login.");
        forgotPassSection.classList.remove('active');
        loginForm.classList.add('active');
        loginTab.classList.add('active'); // Activate login tab
        signupTab.classList.remove('active'); // Deactivate signup tab
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-pass').value;
        const staffCode = document.getElementById('signup-staff-code').value;

        if (users.find(u => u.email === email)) {
            alert("Email already exists! Try logging in.");
            return;
        }

        // Handle Photo Upload
        const photoInput = document.getElementById('signup-photo-file');
        let photoURL = null;
        if (photoInput && photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            // Limit size to 2MB to avoid localStorage issues
            if (file.size > 2 * 1024 * 1024) {
                alert("Photo is too large! Please use an image under 2MB.");
                return;
            }

            photoURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        const newUser = { name, email, password, photo: photoURL };

        // Check if Staff Registration
        if (staffCode === STAFF_REG_CODE) {
            newUser.isAdmin = true;
            alert("Staff Registration Successful! 🛠️\nYou have been granted Normal Admin privileges.");
        }

        users.push(newUser);
        localStorage.setItem('happy_candy_users', JSON.stringify(users));

        currentUser = newUser;
        localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));

        updateAuthUI();
        alert(`Welcome, ${name}! Your account is ready.`);
        authModal.classList.remove('active');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        // Special Check for Admin Loop Recovery
        if (email === ADMIN_EMAIL && pass === SUPER_ADMIN_PASS) {
            // Logged in with Super Admin Pass
            const adminUser = users.find(u => u.email === ADMIN_EMAIL);
            if (adminUser) {
                // Create session with Super Admin flag - DON'T update users array permanently
                currentUser = { ...adminUser, isSuperAdmin: true };

                localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));
                updateAuthUI();
                authModal.classList.remove('active');
                alert("Logged in with Super Admin Key! 🔐\nYou have full access.");
                return;
            }
        }

        const user = users.find(u => u.email === email && u.password === pass);

        if (user) {
            // Normal Admin or Regular User
            const sessionUser = { ...user }; // Create copy for session

            const isAnyNormalAdmin = email === ADMIN_EMAIL || user.isAdmin === true;

            if (isAnyNormalAdmin) {
                sessionUser.isSuperAdmin = false; // Explicitly normal admin or staff
                recordLoginActivity(email); // RECORD normal admin/staff login
            }
            currentUser = sessionUser;
            localStorage.setItem('happy_candy_user', JSON.stringify(currentUser));
            updateAuthUI();
            authModal.classList.remove('active');
        } else {
            // Count failed attempts could go here, but for now simple alert
            alert("Invalid email or password!");
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('happy_candy_user');
        currentUser = null;
        updateAuthUI();
        authModal.classList.remove('active');
    });

    function checkAuth() {
        if (!currentUser) {
            alert("Please create an account or login to proceed with your order! 🍭");
            authModal.classList.add('active');
            return false;
        }
        return true;
    }

    function sendEmailReceipt(msg) {
        if (!currentUser || !currentUser.email) return;

        const subject = "Order Confirmation - Happy Candy 🍭";
        const body = `Hi ${currentUser.name},\n\nThank you for your order! Here is a copy of your receipt:\n\n${msg}\n\nWe will contact you soon for confirmation.`;
        const mailtoUrl = `mailto:${currentUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Use a small delay so WhatsApp/SMS opens first
        setTimeout(() => {
            window.location.href = mailtoUrl;
        }, 1500);
    }

    function finalizeCheckout(msg) {
        // Save to History
        const orderTotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
        saveOrderToHistory({
            items: cart.map(item => ({ name: item.name, quantity: item.quantity })),
            total: orderTotal,
            payment: selectedPaymentMethod
        });

        // 1. Open WhatsApp/Communication
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');

        // 2. Send Email Receipt
        sendEmailReceipt(msg);

        // 3. Save Order to Database (for Admin Panel)
        const orderData = {
            customerName: currentUser.name,
            customerEmail: currentUser.email,
            items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
            total: cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0),
            paymentMethod: selectedPaymentMethod,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'Pending'
        };

        db.collection('orders').add(orderData)
            .then(() => console.log("Order saved to DB ✅"))
            .catch(err => console.error("Error saving order: ", err));

        // 3. Clear Cart
        cart = [];
        updateCartUI();
        toggleCart();
        alert("Order completed! Check your Profile for history. 🍭");
    }

    // Checkout via WhatsApp
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (!checkAuth()) return;
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const msg = generateOrderMessage();

            if (selectedPaymentMethod === "Online Card Payment") {
                checkoutBtn.innerHTML = 'Redirecting to Gateway... <i class="fas fa-spinner fa-spin"></i>';
                checkoutBtn.disabled = true;

                setTimeout(() => {
                    alert("This will now redirect to a secure Payment Gateway.\n\nDemonstration complete. Finalizing order details...");
                    selectedPaymentMethod = "Online Card Payment (Success)";
                    const finalMsg = generateOrderMessage();
                    finalizeCheckout(finalMsg);

                    checkoutBtn.innerHTML = 'Pay Online Securely <i class="fas fa-lock"></i>';
                    checkoutBtn.disabled = false;
                }, 2000);
                return;
            }

            finalizeCheckout(msg);
        });
    }

    // Checkout via SMS
    if (checkoutBtnSms) {
        checkoutBtnSms.addEventListener('click', () => {
            if (!checkAuth()) return;
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const msg = generateOrderMessage();

            // Determine OS for SMS separator (iOS usually prefers '&', Android '?')
            const ua = navigator.userAgent.toLowerCase();
            const isIOS = /iphone|ipad|ipod/.test(ua);
            const separator = isIOS ? '&' : '?';

            // 1. Open SMS
            const url = `sms:+${whatsappNumber}${separator}body=${encodeURIComponent(msg)}`;
            window.location.href = url;

            // 2. Send Email Receipt to Customer (Wait slightly for SMS app to trigger)
            sendEmailReceipt(msg);
        });
    }
    // --- Multi-Language Logic ---


    const langBtns = document.querySelectorAll('.lang-btn');
    currentLang = 'en';

    function setLanguage(lang) {
        currentLang = lang;
        document.body.classList.toggle('lang-jp', lang === 'jp');

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });

        // Refresh categories to update their translated names
        renderGalleryCategories();

        // Update active class on buttons
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // Refresh payment UI if it exists
        if (typeof updatePaymentUI === 'function' && selectedPaymentMethod) {
            updatePaymentUI(selectedPaymentMethod);
        }

        // Refresh products if a category is active
        const activeCategory = document.querySelector('.gallery-item.active');
        if (activeCategory) {
            renderProducts(activeCategory.getAttribute('data-category'));
        }

        // Trigger Candy Rain on language change
        createCandyRain();

        // Persist language
        localStorage.setItem('happy_candy_lang', lang);

        // Render About Us from Config
        const aboutConfig = JSON.parse(localStorage.getItem('happy_candy_about'));
        if (aboutConfig && aboutConfig.desc) {
            // Find the About paragraph. It might be inside a specific container.
            // Based on index.html structure (which I should recall or check), it's likely <section id="about">...<p>...</p>
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
                const p = aboutSection.querySelector('p');
                if (p) p.innerHTML = aboutConfig.desc;

                // Update Owner Info
                if (aboutConfig.ownerName) document.querySelector('.owner-name').innerText = aboutConfig.ownerName;
                if (aboutConfig.ownerRole) document.querySelector('.owner-role').innerText = aboutConfig.ownerRole;
                if (aboutConfig.ownerImg) document.getElementById('owner-photo').src = aboutConfig.ownerImg;
            }
        }
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.getAttribute('data-lang'));
        });
    });

    // Check for saved language
    const savedLang = localStorage.getItem('happy_candy_lang');
    if (savedLang) setLanguage(savedLang);

    // --- AI Chatbot Widget Logic ---
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatPopup = document.getElementById('chat-popup');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatBody = document.getElementById('chat-body');

    if (chatToggleBtn && chatPopup) {
        chatToggleBtn.addEventListener('click', () => {
            chatPopup.classList.add('active');
        });
    }

    if (closeChatBtn && chatPopup) {
        closeChatBtn.addEventListener('click', () => {
            chatPopup.classList.remove('active');
        });
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;
        msgDiv.innerText = text;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function getAIResponse(input) {
        const text = input.toLowerCase();

        // 1. Check for specific product queries
        // Look for product names in the query
        let foundProduct = null;
        let foundInJP = false;

        // Search EN inventory
        for (const cat in products) {
            const p = products[cat].find(item => text.includes(item.name.toLowerCase()));
            if (p) { foundProduct = p; break; }
        }

        // Search JP inventory if not found
        if (!foundProduct) {
            for (const cat in productsJP) {
                const p = productsJP[cat].find(item => text.includes(item.name.toLowerCase()));
                if (p) { foundProduct = p; foundInJP = true; break; }
            }
        }

        if (foundProduct) {
            const price = foundInJP ? foundProduct.price : formatPrice(foundProduct.price);
            if (text.includes('price') || text.includes('cost') || text.includes('keeyada') || text.includes('ikura')) {
                return `The price of ${foundProduct.name} is ${price}. 💰`;
            }
            if (text.includes('have') || text.includes('stock') || text.includes('thiyenawada') || text.includes('arimasuka')) {
                return `Yes! We have ${foundProduct.name} in stock. It costs ${price}. Shall I add it to your cart? 🛒`;
            }
            return `Ah, ${foundProduct.name}! It's a delicious treat for only ${price}. 😋`;
        }

        // 2. Keyword Matching (Multilingual)
        if (text.includes("hi") || text.includes("hello") || text.includes("ayubowan") || text.includes("konnichiwa")) { // Greetings
            return "Hello there! Welcome to Happy Candy! How can I help you today? 🍬";
        }
        if (text.includes("price") || text.includes("cost") || text.includes("ganan") || text.includes("mila")) { // Price
            return "Our sweets start from Rs. 50! Imported chocolates start from Rs. 450. You can check the Gallery for all prices. 💰";
        }
        if (text.includes("delivery") || text.includes("ship") || text.includes("ewanawada") || text.includes("haisou")) { // Delivery
            return "We offer island-wide delivery in Sri Lanka! 🚚 For Japan, we use Japan Post.";
        }
        if (text.includes("payment") || text.includes("pay") || text.includes("salli") || text.includes("shiharai")) { // Payment
            return "You can pay via Cash on Delivery, Bank Transfer, or Online Card Payment! 💳";
        }
        if (text.includes("location") || text.includes("koheda") || text.includes("basho") || text.includes("address")) { // Location
            return "We are based in Narammala, Sri Lanka! But we are an online store delivering happiness everywhere. 🌍";
        }
        if (text.includes("contact") || text.includes("phone") || text.includes("number") || text.includes("call")) { // Contact
            return "Call us at +94 76 849 4653 or WhatsApp us! 📞";
        }
        if (text.includes("owner") || text.includes("aihti") || text.includes("kauda")) { // Owner
            return "Our founder is Mr. Dilshan Kavinda! He loves making kids happy. 👨‍💼";
        }
        if (text.includes("offer") || text.includes("discount") || text.includes("aduda")) { // Offers
            if (hotDealsConfig.active) {
                return `Yes! We have a HOT DEAL right now: ${hotDealsConfig.text} 🔥`;
            }
            return "Check out our Special Offers section for the latest deals! 🎁";
        }

        return "I'm not sure about that, but I'm learning! You can browse our catalogue or ask me about prices and delivery. 🍭";
    }

    function handleChat() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        // Bot thinking...
        setTimeout(() => {
            const response = getAIResponse(text);
            addMessage(response, 'bot');
        }, 600);
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', handleChat);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }

    // --- Search Logic ---
    const siteSearch = document.getElementById('site-search');
    if (siteSearch) {
        siteSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                const activeCat = document.querySelector('.gallery-item.active')?.getAttribute('data-category') || 'cookies';
                renderProducts(activeCat);
                return;
            }

            // Simple multi-category search
            let results = [];
            for (let catId in products) {
                const filtered = products[catId].filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.desc && p.desc.toLowerCase().includes(query))
                );
                results = results.concat(filtered);
            }

            // Build custom display for search results
            let html = '<div class="product-list">';
            if (results.length === 0) {
                html += '<p style="grid-column:1/-1; text-align:center; padding:50px; color:#999;">No sweets match your search. 🍭😭</p>';
            } else {
                results.forEach(product => {
                    const safeName = product.name.replace(/'/g, "\\'");
                    const safeImg = product.img.replace(/'/g, "\\'");
                    const rating = 4 + Math.floor(Math.random() * 2);
                    let ratingHtml = '<div class="candy-rating">';
                    for (let i = 0; i < 5; i++) ratingHtml += `<i class="fas fa-candy-cane" style="color:${i < rating ? 'var(--primary-color)' : '#ddd'}"></i>`;
                    ratingHtml += '</div>';

                    html += `
                        <div class="product-card" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&apos;")})'>
                            <div class="product-img-wrapper" style="position:relative; height:150px; background:#f9f9f9; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                                <img src="${product.img}" alt="${product.name}" class="product-img" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div style="padding:0 5px;">
                                <h4 class="product-name" style="margin-top:10px;">${product.name}</h4>
                                ${ratingHtml}
                                <p class="product-desc" style="font-size:0.85rem; color:#666; margin:5px 0 10px; line-height:1.3; height:35px; overflow:hidden;">${product.desc || ''}</p>
                                <span class="product-price">${formatPrice(product.price)}</span>
                            </div>
                            <div class="product-buttons" onclick="event.stopPropagation()">
                                <button class="btn-buy" onclick="orderProduct('${safeName}')">Buy No</button>
                                <button class="btn-cart" onclick="addToCartWithEffect(event, '${safeName}', '${product.price}', '${safeImg}')">Add to Cart</button>
                            </div>
                        </div>
                    `;
                });
            }
            html += '</div>';
            document.getElementById('product-display').innerHTML = html;
        });
    }

    // --- Wishlist Logic ---
    window.toggleWishlist = function (name, price, img) {
        const index = wishlist.findIndex(w => w.name === name);
        if (index === -1) {
            wishlist.push({ name, price, img });
            alert("Added to Wishlist! ❤️");
        } else {
            wishlist.splice(index, 1);
            alert("Removed from Wishlist! 💔");
        }
        localStorage.setItem('happy_candy_wishlist', JSON.stringify(wishlist));
        updateWishlistUI();
        // Re-render gallery to update heat icon
        const activeCat = document.querySelector('.gallery-item.active')?.getAttribute('data-category') || 'cookies';
        renderProducts(activeCat);
    }

    function updateWishlistUI() {
        const count = document.getElementById('wishlist-count');
        if (count) count.textContent = wishlist.length;
    }
    updateWishlistUI();

    // Toggle Wishlist View (Using search-like display)
    document.getElementById('wishlist-toggle').addEventListener('click', () => {
        if (wishlist.length === 0) return alert("Your wishlist is empty! Heart some items first. ❤️🍭");

        let html = '<h2 style="grid-column:1/-1; text-align:center; color:var(--primary-color);">My Favorite Sweets ❤️</h2><div class="product-list">';
        wishlist.forEach(product => {
            // ... basic card structure for wishlist
            html += `
                <div class="product-card">
                    <img src="${product.img}" style="width:100%; height:120px; object-fit:cover; border-radius:10px;">
                    <h4 style="margin:10px 0;">${product.name}</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        <button onclick="toggleWishlist('${product.name.replace(/'/g, "\\'")}', '${product.price}', '${product.img.replace(/'/g, "\\'")}')" style="background:none; border:none; color:#ff4757; cursor:pointer;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
             `;
        });
        html += '</div>';
        document.getElementById('product-display').innerHTML = html;
        document.getElementById('product-display').scrollIntoView({ behavior: 'smooth' });
    });

    // --- Flying Effect Logic ---
    window.addToCartWithEffect = function (e, name, price, img) {
        addToCart(name, price, img);

        const btn = e.target.closest('button');
        const cartIcon = document.getElementById('cart-toggle');
        if (!btn || !cartIcon) return;

        const rect = btn.getBoundingClientRect();
        const flyImg = document.createElement('img');
        flyImg.src = img;
        flyImg.className = 'fly-item';
        flyImg.style.top = rect.top + 'px';
        flyImg.style.left = rect.left + 'px';
        flyImg.style.width = '40px';
        flyImg.style.height = '40px';

        document.body.appendChild(flyImg);

        const cartRect = cartIcon.getBoundingClientRect();

        setTimeout(() => {
            flyImg.style.top = cartRect.top + 'px';
            flyImg.style.left = cartRect.left + 'px';
            flyImg.style.width = '10px';
            flyImg.style.height = '10px';
            flyImg.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            flyImg.remove();
            cartIcon.classList.add('bounce-cart');
            setTimeout(() => cartIcon.classList.remove('bounce-cart'), 300);
        }, 800);
    }

    // --- Confetti Logic ---
    window.triggerConfetti = function () {
        const colors = ['#ff6b81', '#7bed9f', '#eccc68', '#70a1ff', '#ff9f43'];
        for (let i = 0; i < 50; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + 'vw';
            c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            c.style.transform = `rotate(${Math.random() * 360}deg)`;
            c.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 4000);
        }
    }

    // Trigger stats when admin panel opens
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.getAttribute('data-tab') === 'stats-tab') {
                renderAdminStats();
            }
        });
    });

    // Update finalizeCheckout to trigger confetti
    const originalFinalize = window.finalizeCheckout;
    window.finalizeCheckout = function (msg) {
        if (typeof originalFinalize === 'function') originalFinalize(msg);
        triggerConfetti();
        alert("🎉 BOOM! Order Placed Successfully! Get ready for some sweetness!");
    }

    // --- Premium Interactivity: Responsive Candy Swarm ---
    document.addEventListener('mousemove', (e) => {
        const candies = document.querySelectorAll('.candy');
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        candies.forEach(candy => {
            const rect = candy.getBoundingClientRect();
            // We use the current position from the animation or initial position
            const candyX = rect.left + rect.width / 2;
            const candyY = rect.top + rect.height / 2;

            const dist = Math.sqrt(Math.pow(mouseX - candyX, 2) + Math.pow(mouseY - candyY, 2));

            if (dist < 150) {
                const angle = Math.atan2(candyY - mouseY, candyX - mouseX);
                const force = (150 - dist) / 15;
                const moveX = Math.cos(angle) * force;
                const moveY = Math.sin(angle) * force;

                candy.style.transition = "transform 0.2s ease-out";
                candy.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.3) rotate(25deg)`;
                candy.style.opacity = "0.8";
            } else {
                candy.style.transform = `translate(0, 0) scale(1) rotate(0deg)`;
                candy.style.opacity = "0.3";
            }
        });
    });

    // --- Welcome Voice Greeting ---
    const greetings = {
        en: "Welcome to Happy Candy shop! Enjoy our sweets!",
        si: "හැපි කැන්ඩි සාප්පුවට සාදරයෙන් පිළිගනිමු! රසවත් පැණි රස කෑම භුක්ති විඳින්න!",
        ta: "ஹேப்பி කැන්ඩි கடைக்கு உங்களை வரவேற்கிறோம்! எங்கள் இனிப்புகளை அனுபவிக்கவும்!",
        jp: "ハッピーキャンディショップへようこそ！美味しいスイーツをお楽しみください！"
    };

    let hasGreeted = false;
    document.addEventListener('click', () => {
        if (!hasGreeted && appSettings.isVoiceEnabled) {
            const utterance = new SpeechSynthesisUtterance(greetings[currentLang] || greetings.en);
            utterance.rate = 1.0;
            utterance.pitch = 1.2;
            utterance.lang = currentLang === 'jp' ? 'ja-JP' : (currentLang === 'si' ? 'si-LK' : 'en-US');

            // Note: Some browsers block auto-audio, so we trigger it on first click
            window.speechSynthesis.speak(utterance);
            hasGreeted = true;
        }
    }, { once: true });

    // --- Hot Deals Render Function ---
    function renderHotDealsBanner() {
        const banner = document.getElementById('hot-deals-banner');
        if (!banner) return;

        if (hotDealsConfig && hotDealsConfig.active) {
            banner.style.display = 'block';
            banner.style.backgroundColor = hotDealsConfig.bgColor;
            banner.style.color = hotDealsConfig.textColor;
            document.getElementById('hot-deals-text').textContent = hotDealsConfig.text;

            // Adjust header position if needed (simple fix)
            const loader = document.querySelector('.site-loader');
            if (loader) loader.style.zIndex = "30000";

            // Close button logic
            document.getElementById('hot-deals-close').onclick = () => {
                banner.style.display = 'none';
            };
        } else {
            banner.style.display = 'none';
        }
    }

    // Initial Render
    renderHotDealsBanner();

    // --- Homepage Banner Render Function ---
    function renderHomeBanner() {
        const section = document.getElementById('big-selling');

        // Initial check for visibility
        if (section) {
            section.style.display = (homeBannerConfig.active !== false) ? 'block' : 'none';
        }

        if (homeBannerConfig.active === false) return; // Stop if hidden

        const titleEl = document.querySelector('#big-selling .banner-title');
        const badgeEl = document.querySelector('#big-selling .banner-badge');

        // Features
        const f1Title = document.querySelector('[data-i18n="deal_1"]');
        const f1Desc = document.querySelector('[data-i18n="deal_1_desc"]');
        const f2Title = document.querySelector('[data-i18n="deal_2"]');
        const f2Desc = document.querySelector('[data-i18n="deal_2_desc"]');
        const f3Title = document.querySelector('[data-i18n="deal_3"]');
        const f3Desc = document.querySelector('[data-i18n="deal_3_desc"]');

        if (titleEl) titleEl.innerText = homeBannerConfig.title;
        if (badgeEl) badgeEl.innerText = homeBannerConfig.badge;
        if (section && homeBannerConfig.g1 && homeBannerConfig.g2) {
            section.style.background = `linear-gradient(135deg, ${homeBannerConfig.g1}, ${homeBannerConfig.g2})`;
        }

        if (f1Title && homeBannerConfig.f1Title) f1Title.innerText = homeBannerConfig.f1Title;
        if (f1Desc && homeBannerConfig.f1Desc) f1Desc.innerText = homeBannerConfig.f1Desc;

        if (f2Title && homeBannerConfig.f2Title) f2Title.innerText = homeBannerConfig.f2Title;
        if (f2Desc && homeBannerConfig.f2Desc) f2Desc.innerText = homeBannerConfig.f2Desc;

        if (f3Title && homeBannerConfig.f3Title) f3Title.innerText = homeBannerConfig.f3Title;
        if (f3Desc && homeBannerConfig.f3Desc) f3Desc.innerText = homeBannerConfig.f3Desc;
    }
    renderHomeBanner();

    // --- Category Sidebar Logic ---
    const sidebar = document.getElementById('category-sidebar');
    const catToggleBtn = document.getElementById('category-toggle-btn');
    const closeSidebarBtn = document.getElementById('close-cat-sidebar');
    const sidebarList = document.getElementById('quick-category-list');

    function toggleSidebar() {
        if (sidebar) sidebar.classList.toggle('active');
        populateSidebar();
    }

    if (catToggleBtn) catToggleBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            e.target !== catToggleBtn &&
            !catToggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    function populateSidebar() {
        if (!sidebarList) return;
        sidebarList.innerHTML = '';

        // Use global appCategories
        const cats = appCategories || [];
        cats.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'sidebar-cat-item';

            // Smart Icon Mapping based on keywords
            let icon = 'fa-candy-cane';
            const nameL = cat.name.toLowerCase();
            const idL = cat.id.toLowerCase();

            if (idL.includes('choc') || nameL.includes('chocolate')) icon = 'fa-cookie-bite';
            if (idL.includes('cake') || nameL.includes('cake')) icon = 'fa-birthday-cake';
            if (idL.includes('gift') || nameL.includes('gift')) icon = 'fa-gift';
            if (idL.includes('ice') || nameL.includes('ice')) icon = 'fa-ice-cream';
            if (idL.includes('drink') || nameL.includes('drink')) icon = 'fa-wine-glass-alt';

            item.innerHTML = `<i class="fas ${icon}"></i> <span>${cat.name}</span>`;
            item.onclick = () => {
                sidebar.classList.remove('active');
                if (typeof renderProducts === 'function') {
                    renderProducts(cat.id);
                    const gallery = document.getElementById('gallery');
                    if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
                }
            };
            sidebarList.appendChild(item);
        });
    }

    // --- Dynamic Reviews Render & Slide ---
    function renderReviews() {
        const container = document.getElementById('reviews-slider-container');
        const dotsContainer = document.getElementById('reviews-dots');
        if (!container || !appReviews.length) return;

        container.innerHTML = '';
        if (dotsContainer) dotsContainer.innerHTML = '';

        appReviews.forEach((r, i) => {
            const slide = document.createElement('div');
            slide.className = `review-slide ${i === 0 ? 'active' : ''}`;
            slide.innerHTML = `
                <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
                <p>"${r.text}"</p>
                <h4>- ${r.name}</h4>
            `;
            container.appendChild(slide);

            if (dotsContainer) {
                const dot = document.createElement('span');
                dot.className = `dot ${i === 0 ? 'active' : ''}`;
                dot.onclick = () => {
                    showReviewSlide(i);
                    resetReviewInterval();
                };
                dotsContainer.appendChild(dot);
            }
        });
    }

    let currentReviewIdx = 0;
    let reviewInterval;

    function showReviewSlide(n) {
        const slides = document.querySelectorAll('.review-slide');
        const dots = document.querySelectorAll('.slider-dots .dot');
        if (!slides.length) return;

        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));

        currentReviewIdx = n;
        if (currentReviewIdx >= slides.length) currentReviewIdx = 0;
        if (currentReviewIdx < 0) currentReviewIdx = slides.length - 1;

        if (slides[currentReviewIdx]) slides[currentReviewIdx].classList.add('active');
        if (dots[currentReviewIdx]) dots[currentReviewIdx].classList.add('active');
    }

    function nextReview() {
        showReviewSlide(currentReviewIdx + 1);
    }

    function resetReviewInterval() {
        clearInterval(reviewInterval);
        reviewInterval = setInterval(nextReview, 4000);
    }

    // Start Reviews
    renderReviews();
    resetReviewInterval();

    // --- World Class Feature: Scroll Reveal ---
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    function applyReveal() {
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    }

    // Patch renderProducts to apply reveal
    const originalRenderProducts = renderProducts;
    renderProducts = function (cat) {
        originalRenderProducts(cat);
        applyReveal();
    };

    // --- World Class Feature: 3D Tilt Effect ---
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
                const xc = rect.width / 2;
                const yc = rect.height / 2;
                const dx = x - xc;
                const dy = y - yc;
                card.style.transform = `perspective(1000px) rotateY(${dx / 10}deg) rotateX(${-dy / 10}deg) translateY(-5px)`;
            } else {
                card.style.transform = '';
            }
        });
    });

    // --- World Class Feature: Social Proof Sales Alerts ---
    const locations = ["Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Kurunegala", "Matara"];
    const buyers = ["Someone", "A customer", "A sweet lover", "A kid", "Dilshan", "Sandun", "Priya"];

    function triggerSalesAlert() {
        if (appSettings.isSalesAlertEnabled === false) return; // Super Admin Control

        const alertBox = document.getElementById('sales-alert');

        // Pick a random product from any category
        const allCats = Object.keys(products);
        const randomCat = allCats[Math.floor(Math.random() * allCats.length)];
        const catProds = products[randomCat] || [];
        if (catProds.length === 0) return;
        const prod = catProds[Math.floor(Math.random() * catProds.length)];

        const loc = locations[Math.floor(Math.random() * locations.length)];
        const buyer = buyers[Math.floor(Math.random() * buyers.length)];

        alertImg.src = prod.img;
        alertText.innerHTML = `${buyer} just bought <b>${prod.name}</b>!`;
        alertTime.innerText = `Just now from ${loc}`;

        alertBox.classList.add('active');
        setTimeout(() => alertBox.classList.remove('active'), 5000);
    }

    // Start sales alerts loop
    setInterval(triggerSalesAlert, 15000); // Every 15 seconds
    setTimeout(triggerSalesAlert, 3000); // First one after 3 seconds

    applyReveal();

    // --- Elite Feature: Remove Loader ---
    window.addEventListener('load', () => {
        const loader = document.getElementById('site-loader');
        setTimeout(() => {
            if (loader) {
                // MAINTENANCE CHECK
                // Using appSettings from the outer scope which is loaded from localStorage initially
                // and potentially updated by firebase sync.
                if (appSettings.isSitePublished === false && !sessionStorage.getItem('super_admin_unlocked') && (!currentUser || !currentUser.isSuperAdmin)) {
                    // Ensure UI shows maintenance mode
                    const loaderText = document.getElementById('loader-text');
                    const loaderProgress = document.getElementById('loader-progress');
                    const maintenanceLogin = document.getElementById('maintenance-login');

                    if (loaderText) {
                        loaderText.innerText = "Construction Mode Active 🚧";
                        loaderText.style.color = "#e17055";
                    }
                    if (loaderProgress) loaderProgress.style.display = 'none';
                    if (maintenanceLogin) maintenanceLogin.style.display = 'block';

                    return; // Do NOT hide loader
                }

                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 800);
            }
        }, 1500); // Give users a moment to see the sweet loader
    });

    // --- Elite Feature: Exit Intent Popup ---
    let exitShown = sessionStorage.getItem('exit_shown');
    document.addEventListener('mouseleave', (e) => {
        if (appSettings.isExitPopupEnabled === false) return; // Super Admin Control
        if (e.clientY < 0 && !exitShown) {
            document.getElementById('exit-popup').classList.add('active');
            exitShown = true;
            sessionStorage.setItem('exit_shown', true);
        }
    });

    const closeExitBtn = document.querySelector('.close-exit-popup');
    if (closeExitBtn) {
        closeExitBtn.addEventListener('click', () => {
            document.getElementById('exit-popup').classList.remove('active');
        });
    }

    const copyExitBtn = document.getElementById('copy-exit-coupon');
    if (copyExitBtn) {
        copyExitBtn.addEventListener('click', () => {
            navigator.clipboard.writeText("SWEET5");
            alert("Code SWEET5 copied! Use it in your cart for 5% OFF! 🎁");
            document.getElementById('exit-popup').classList.remove('active');
        });
    }

    // --- Elite Feature: Product Modal Image Zoom ---
    const modalImgWrapper = document.querySelector('.product-modal-img-side');
    if (modalImgWrapper) {
        const img = modalImgWrapper.querySelector('img');
        modalImgWrapper.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = modalImgWrapper.getBoundingClientRect();
            const x = ((e.clientX - left) / width) * 100;
            const y = ((e.clientY - top) / height) * 100;
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = "scale(2)";
        });
        modalImgWrapper.addEventListener('mouseleave', () => {
            img.style.transform = "scale(1)";
        });
    }
    // --- Elite Feature: FAQ Accordion ---
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const answer = q.nextElementSibling;
            const icon = q.querySelector('i');

            answer.classList.toggle('show');
            icon.classList.toggle('fa-plus');
            icon.classList.toggle('fa-minus');
            q.classList.toggle('active');
        });
    });

    // --- Elite Feature: Review Slider ---
    let currentReview = 0;
    const reviews = document.querySelectorAll('.review-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');

    function showReview(n) {
        reviews.forEach(r => r.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        reviews[n].classList.add('active');
        dots[n].classList.add('active');
    }

    setInterval(() => {
        currentReview = (currentReview + 1) % reviews.length;
        showReview(currentReview);
    }, 5000);

    // --- Elite Feature: Invoice & Checkout ---
    const invoiceModal = document.getElementById('invoice-modal');
    const closeInvoice = document.getElementById('close-invoice');

    function showInvoice() {
        if (cart.length === 0) return alert("Cart is empty!");

        const itemsBody = document.getElementById('invoice-items');
        let subtotal = 0;
        itemsBody.innerHTML = '';

        cart.forEach(item => {
            const lineTotal = parsePrice(item.price) * item.quantity;
            subtotal += lineTotal;
            itemsBody.innerHTML += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>Rs. ${lineTotal}</td></tr>`;
        });

        const discount = activeCoupon ? Math.floor(subtotal * activeCoupon.percent / 100) : 0;
        document.getElementById('inv-date').textContent = new Date().toLocaleDateString();
        document.getElementById('inv-customer').textContent = currentUser ? currentUser.name : "Guest";
        document.getElementById('inv-subtotal').textContent = `Rs. ${subtotal}`;
        document.getElementById('inv-discount').textContent = `Rs. ${discount}`;
        document.getElementById('inv-grandtotal').textContent = `Rs. ${subtotal - discount}`;

        invoiceModal.classList.add('active');
    }

    if (checkoutBtn) checkoutBtn.addEventListener('click', showInvoice);
    if (closeInvoice) closeInvoice.addEventListener('click', () => invoiceModal.classList.remove('active'));

    document.getElementById('confirm-whatsapp')?.addEventListener('click', () => {
        invoiceModal.classList.remove('active');
        const addr = document.getElementById('cus-address')?.value || "No address provided";
        const total = document.getElementById('inv-grandtotal').textContent;
        let msg = `*NEW ORDER - HAPPY CANDY* 🍭\n\n`;
        cart.forEach(i => msg += `• ${i.name} x${i.quantity}\n`);
        msg += `\n*Total:* ${total}\n*Address:* ${addr}\n\nThank you! ✨`;
        window.open(`https://wa.me/0768494653?text=${encodeURIComponent(msg)}`, '_blank');
        cart = [];
        localStorage.setItem('happy_candy_cart', JSON.stringify(cart));
        updateCartUI();
        triggerConfetti();
    });
    // --- Ultimate Feature: Dark Mode Toggle ---
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeBtn.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'fas fa-sun';
                localStorage.setItem('happy_candy_darkmode', 'on');
            } else {
                icon.className = 'fas fa-moon';
                localStorage.setItem('happy_candy_darkmode', 'off');
            }
        });
    }

    // Load Dark Mode Preference
    if (localStorage.getItem('happy_candy_darkmode') === 'on') {
        document.body.classList.add('dark-mode');
        if (darkModeBtn) darkModeBtn.querySelector('i').className = 'fas fa-sun';
    }

    // --- Ultimate Feature: Browser Tab Magic ---
    const originalTitle = document.title;
    window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.title = "Don't forget your sweets! 🍭";
        } else {
            document.title = originalTitle;
        }
    });

    // --- Ultimate Feature: Newsletter Subscription ---
    const newsForm = document.getElementById('newsletter-form');
    if (newsForm) {
        newsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('news-email').value;
            alert(`Sweet! 🎁 You've joined the club with: ${email}. Watch your inbox for treats!`);
            newsForm.reset();
        });
    }

    // --- Ultimate Feature: Voice Greeting (Greeting on click) ---
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            const msg = "Welcome to Happy Candy! The sweetest place on earth.";
            const speech = new SpeechSynthesisUtterance(msg);
            speech.rate = 1.2;
            speech.pitch = 1.2;
            window.speechSynthesis.speak(speech);
        });
    }
});
