<?php
// Skopiuj ten plik jako contact-config.php i uzupełnij prawdziwymi danymi.
// contact-config.php NIE jest wersjonowany w git (patrz .gitignore) — zawiera hasło do skrzynki.

return [
    // Dane skrzynki pocztowej z panelu Hostingera (hPanel -> Emaile),
    // z której wysyłane będą wiadomości z formularza (SMTP, nie mail()).
    'smtp_host' => 'smtp.hostinger.com',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl', // 'ssl' dla portu 465, 'tls' dla portu 587
    'smtp_user' => 'info@bokagardenroom.pl',
    'smtp_pass' => 'TU_WSTAW_HASLO',

    // Nadawca i odbiorca wiadomości
    'from_email' => 'info@bokagardenroom.pl',
    'from_name' => 'Formularz BOKA Garden Room',
    'to_email' => 'info@bokagardenroom.pl',
    'to_name' => 'BOKA Garden Room',

    // Domeny, z których formularz może realnie wysyłać zapytania (ochrona przed
    // użyciem Twojego endpointu z obcej strony). Podaj bez "https://" i bez "/".
    'allowed_origins' => [
        'bokagardenroom.pl',
        'www.bokagardenroom.pl',
    ],
];
