<?php
/**
 * Gestore unico per i 3 form del sito (Soggiorno, Accrediti Area Team,
 * Richiedi informazioni). Riceve il POST, valida i campi minimi, compone
 * una mail leggibile e la invia con la funzione mail() di PHP.
 *
 * Non richiede librerie esterne: funziona su qualsiasi hosting con PHP e
 * un server di posta configurato (la maggior parte degli hosting condivisi
 * lo è già). Se il provider richiede SMTP autenticato (es. niente mail()
 * diretta), sostituire la sendMail() qui sotto con PHPMailer/SMTP.
 */

// ---------------------------------------------------------------------------
// CONFIGURAZIONE
// ---------------------------------------------------------------------------

// Destinatario di tutte le richieste.
const TO_EMAIL = 'veloclub.cattolica@email.it';

// Mittente "tecnico" della mail (deve appartenere allo stesso dominio del
// sito per non finire in spam, o peggio essere scartata: un mittente
// "@gmail.com" non autenticato tramite i server di Google viene rifiutato
// dalla policy DMARC di Gmail). Di default usa il dominio su cui è
// effettivamente pubblicato lo script; cambiarlo qui solo se il provider
// richiede un mittente specifico.
$fromDomain = isset($_SERVER['SERVER_NAME']) && $_SERVER['SERVER_NAME'] !== ''
    ? $_SERVER['SERVER_NAME']
    : 'veloclubcattolica.com';
define('FROM_EMAIL', 'no-reply@' . $fromDomain);
define('FROM_NAME', 'Sito Campionati Ciclocross');

// Pagina su cui reindirizzare dopo l'invio (con #ancora e ?sent=... /
// ?error=... per mostrare l'esito). Se manca il referer si usa questa.
const FALLBACK_REDIRECT = 'index.html';

// ---------------------------------------------------------------------------
// DEFINIZIONE DEI FORM GESTITI
// ---------------------------------------------------------------------------
// Ogni voce definisce: etichetta del form, ancora della sezione, campi
// obbligatori e mappa "nome campo" => "etichetta leggibile" per il corpo
// della mail (nell'ordine in cui compaiono nel form).

$forms = [
    'soggiorno' => [
        'label' => 'Richiesta soggiorno',
        'anchor' => 'soggiorno',
        'required' => ['team', 'referente', 'email'],
        'fields' => [
            'team' => 'Nome della società / Team',
            'referente' => 'Referente',
            'email' => 'Email',
            'telefono' => 'Telefono',
            'persone' => 'Numero totale persone',
            'camere' => 'Numero totale camere richieste',
            'camere_singole' => 'Camere singole',
            'camere_doppie' => 'Camere doppie',
            'camere_triple' => 'Camere triple',
            'camere_quadruple' => 'Camere quadruple',
            'trattamento' => 'Trattamento desiderato',
            'data_arrivo' => 'Data arrivo',
            'data_partenza' => 'Data partenza',
            'note' => 'Note',
        ],
    ],
    'area-team' => [
        'label' => 'Accrediti Area Team',
        'anchor' => 'area-team',
        'required' => ['team', 'referente', 'email'],
        'fields' => [
            'team' => 'Nome della società / Team',
            'referente' => 'Referente',
            'email' => 'Email',
            'telefono' => 'Telefono',
            'posti_auto' => 'Posti auto richiesti',
            'partecipanti' => 'Partecipanti',
            'tipo_mezzo' => 'Tipo di mezzo',
            'data_arrivo' => 'Data arrivo',
            'data_partenza' => 'Data partenza',
            'note' => 'Note',
        ],
        // gestiti a parte, sono liste (una riga per veicolo aggiunto)
        'listFields' => [
            'targa' => 'Targa',
            'modello' => 'Modello',
        ],
    ],
    'contatti' => [
        'label' => 'Richiedi informazioni',
        'anchor' => 'richiedi-info',
        'required' => ['nome', 'email', 'messaggio', 'privacy'],
        'fields' => [
            'nome' => 'Nome e cognome',
            'email' => 'Email',
            'telefono' => 'Telefono',
            'oggetto' => 'Oggetto della richiesta',
            'messaggio' => 'Messaggio',
        ],
    ],
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function redirect_with_status(string $anchor, string $status, string $formId = ''): void
{
    $base = FALLBACK_REDIRECT;
    if (!empty($_SERVER['HTTP_REFERER'])) {
        $refererPath = strtok($_SERVER['HTTP_REFERER'], '#');
        if ($refererPath !== false && $refererPath !== '') {
            $base = $refererPath;
        }
    }
    $query = $status . '=' . rawurlencode($formId);
    $separator = (strpos($base, '?') === false) ? '?' : '&';
    header('Location: ' . $base . $separator . $query . '#' . $anchor, true, 303);
    exit;
}

function clean(string $value): string
{
    $value = trim($value);
    // rimuove ritorni a capo per evitare header injection se il valore
    // finisse per errore in un header della mail.
    $value = str_replace(["\r", "\n"], ' ', $value);
    return $value;
}

function is_valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// ---------------------------------------------------------------------------
// ELABORAZIONE
// ---------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . FALLBACK_REDIRECT, true, 303);
    exit;
}

$formId = isset($_POST['form_id']) ? clean((string) $_POST['form_id']) : '';

if (!isset($forms[$formId])) {
    redirect_with_status('top', 'error', 'form_non_valido');
}

$config = $forms[$formId];

// Honeypot anti-spam: campo nascosto che un utente reale non compila mai.
if (!empty($_POST['website'])) {
    // Risposta "silenziosa": si comporta come se fosse andato tutto bene,
    // ma non invia nulla, così un bot non capisce di essere stato bloccato.
    redirect_with_status($config['anchor'], 'sent', $formId);
}

// Validazione campi obbligatori.
foreach ($config['required'] as $requiredField) {
    $value = $_POST[$requiredField] ?? '';
    if ($requiredField === 'privacy') {
        if ($value === '') {
            redirect_with_status($config['anchor'], 'error', $formId);
        }
        continue;
    }
    if (is_array($value)) {
        $value = implode('', $value);
    }
    if (trim((string) $value) === '') {
        redirect_with_status($config['anchor'], 'error', $formId);
    }
}

$emailField = $_POST['email'] ?? '';
if ($emailField !== '' && !is_valid_email((string) $emailField)) {
    redirect_with_status($config['anchor'], 'error', $formId);
}

// Composizione del corpo della mail.
$lines = [];
$lines[] = mb_strtoupper($config['label']) . ' - nuova richiesta dal sito';
$lines[] = 'Ricevuta il ' . date('d/m/Y \a\l\l\e H:i');
$lines[] = str_repeat('-', 48);

foreach ($config['fields'] as $name => $fieldLabel) {
    if (!isset($_POST[$name])) {
        continue;
    }
    $value = $_POST[$name];
    if (is_array($value)) {
        $value = implode(', ', array_map('clean', array_map('strval', $value)));
    } else {
        $value = clean((string) $value);
    }
    if ($value === '') {
        continue;
    }
    $lines[] = $fieldLabel . ': ' . $value;
}

// Campi "a lista" (es. più veicoli in Area Team: targa[] / modello[]).
if (!empty($config['listFields'])) {
    $listKeys = array_keys($config['listFields']);
    $maxCount = 0;
    foreach ($listKeys as $listKey) {
        if (isset($_POST[$listKey]) && is_array($_POST[$listKey])) {
            $maxCount = max($maxCount, count($_POST[$listKey]));
        }
    }
    for ($i = 0; $i < $maxCount; $i++) {
        $rowParts = [];
        foreach ($config['listFields'] as $listKey => $listLabel) {
            $value = $_POST[$listKey][$i] ?? '';
            $value = clean((string) $value);
            if ($value !== '') {
                $rowParts[] = $listLabel . ': ' . $value;
            }
        }
        if ($rowParts) {
            $lines[] = 'Veicolo ' . ($i + 1) . ' - ' . implode(', ', $rowParts);
        }
    }
}

$body = implode("\n", $lines) . "\n";

$submitterName = clean((string) ($_POST['referente'] ?? $_POST['nome'] ?? ''));
$subject = '[Sito Ciclocross] ' . $config['label'] . ($submitterName !== '' ? ' - ' . $submitterName : '');

$headers = [];
$headers[] = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>';
if ($emailField !== '' && is_valid_email((string) $emailField)) {
    $headers[] = 'Reply-To: ' . clean((string) $emailField);
}
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = mail(TO_EMAIL, $encodedSubject, $body, implode("\r\n", $headers));

redirect_with_status($config['anchor'], $sent ? 'sent' : 'error', $formId);
