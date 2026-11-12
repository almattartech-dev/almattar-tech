<?php
declare(strict_types=1);

function showResponse(int $statusCode, string $title, string $message): void
{
    http_response_code($statusCode);
    echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . ' - Almattar-Tech</title>
    <link rel="stylesheet" href="design.css.css">
</head>
<body>
    <main>
        <h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>
        <p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>
        <p><a href="contact.html">Return to contact form</a></p>
    </main>
</body>
</html>';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    showResponse(405, 'Method not allowed', 'Please submit the contact form.');
}

$name = trim((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$honeypot = trim((string) ($_POST['website'] ?? ''));

if ($honeypot !== '') {
    showResponse(200, 'Message sent', 'Thank you. Your message has been submitted.');
}

if (
    strlen($name) > 400
    || strlen($email) > 254
    || strlen($message) > 16000
    || $name === ''
    || preg_match('/^[\p{L}\p{M} ]+$/u', $name) !== 1
    || filter_var($email, FILTER_VALIDATE_EMAIL) === false
    || $message === ''
) {
    showResponse(400, 'Invalid form details', 'Please enter a valid name, email address, and message.');
}

$recipient = 'almattartech@gmail.com';
$subject = 'New contact message - Almattar-Tech';
$body = "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}\n";
$headers = [
    'Reply-To: ' . str_replace(["\r", "\n"], '', $email),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

if (!mail($recipient, $subject, $body, implode("\r\n", $headers))) {
    showResponse(500, 'Message not sent', 'The server could not send your message. Please try again later.');
}

showResponse(200, 'Message sent', 'Thank you. Your message has been submitted.');