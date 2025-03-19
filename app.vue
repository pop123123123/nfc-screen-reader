<template>
  <div class="container mx-auto p-4 max-w-lg">
    <h1 class="text-2xl font-bold mb-6 text-center">NFC Text Reader/Writer</h1>

    <div v-if="nfcSupported === false" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
      <p>Your device doesn't support NFC or the Web NFC API.</p>
    </div>

    <div v-if="status" :class="statusClass" class="p-4 mb-6 rounded" role="status">
      {{ status }}
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Read Mode Section -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <h2 class="text-xl font-semibold mb-4">Read NFC Tag</h2>
        <p class="mb-4 text-gray-600">Tap an NFC tag to read its content.</p>

        <div v-if="notificationPermission !== 'granted'" class="mb-4">
          <button
            @click="requestNotificationPermission"
            class="text-blue-500 underline"
          >
            Enable notifications
          </button>
        </div>

        <div v-if="notificationPermission === 'granted'" class="mb-4 flex items-center">
          <input
            type="checkbox"
            id="notification-toggle"
            v-model="showNotificationsToggle"
            class="mr-2"
          />
          <label for="notification-toggle">Show notifications when tags are read</label>
        </div>
        <button
          @click="startReading"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition"
          :disabled="isReading || !nfcSupported"
        >
          {{ isReading ? 'Listening for tags...' : 'Start Reading' }}
        </button>

        <div v-if="readText" class="mt-4 p-3 bg-white border rounded">
          <h3 class="font-medium mb-2">Tag Content:</h3>
          <p class="break-words">{{ readText }}</p>
        </div>
      </div>

      <!-- Write Mode Section -->
      <div class="border rounded-lg p-4 bg-gray-50">
        <h2 class="text-xl font-semibold mb-4">Write to NFC Tag</h2>
        <div class="mb-4">
          <label for="write-text" class="block mb-2 text-gray-700">Text to write:</label>
          <textarea
            id="write-text"
            v-model="textToWrite"
            rows="4"
            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter text to write to the NFC tag..."
          ></textarea>
        </div>
        <button
          @click="startWriting"
          class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition"
          :disabled="isWriting || !textToWrite || !nfcSupported"
        >
          {{ isWriting ? 'Tap a tag to write...' : 'Write to Tag' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: any;
  encoding?: string;
  lang?: string;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

declare global {
  interface Window {
    NDEFReader: any;
  }
}

type StatusType = 'info' | 'success' | 'error';

const nfcSupported = ref<boolean | null>(null);
const isReading = ref<boolean>(false);
const isWriting = ref<boolean>(false);
const readText = ref<string>('');
const textToWrite = ref<string>('');
const status = ref<string>('');
const statusClass = ref<string>('');
const notificationPermission = ref<NotificationPermission | null>(null);
const showNotificationsToggle = ref<boolean>(false);

// Check if NFC is supported and notification permission
onMounted(() => {
  // Check NFC support
  if ('NDEFReader' in window) {
    nfcSupported.value = true;
  } else {
    nfcSupported.value = false;
  }

  // Check notification support
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission;
  }
});

// Set status message with color
function setStatus(message: string, type: StatusType = 'info'): void {
  status.value = message;

  switch (type) {
    case 'success':
      statusClass.value = 'bg-green-100 text-green-800';
      break;
    case 'error':
      statusClass.value = 'bg-red-100 text-red-800';
      break;
    case 'info':
    default:
      statusClass.value = 'bg-blue-100 text-blue-800';
      break;
  }

  // Clear status after 3 seconds
  setTimeout(() => {
    status.value = '';
  }, 3000);
}

// Request notification permission
async function requestNotificationPermission(): Promise<void> {
  try {
    if (!('Notification' in window)) {
      setStatus('Notifications not supported in this browser', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    notificationPermission.value = permission;

    if (permission === 'granted') {
      setStatus('Notification permission granted', 'success');
    } else {
      setStatus('Notification permission denied', 'error');
    }
  } catch (error: any) {
    console.error('Error requesting notification permission:', error);
    setStatus('Failed to request notification permission', 'error');
  }
}

// Show notification with tag content
function showNotification(text: string): void {
  if (notificationPermission.value !== 'granted' || !showNotificationsToggle.value) {
    return;
  }

  try {
    new Notification('NFC Tag Read', {
      body: text,
      // icon: '/pwa-192x192.png',
    });
  } catch (error: any) {
    console.error('Error showing notification:', error);
    setStatus(`Error showing notification: ${error.message}`, 'error');
  }
}
// Start reading NFC tags
async function startReading(): Promise<void> {
  if (!nfcSupported.value) return;

  try {
    isReading.value = true;
    readText.value = '';

    const ndef = new window.NDEFReader();
    await ndef.scan();

    setStatus('Scanning for NFC tags...', 'info');

    ndef.addEventListener('reading', (event: NDEFReadingEvent) => {
      for (const record of event.message.records) {
        if (record.recordType === 'text') {
            const textDecoder = new TextDecoder();
            readText.value = textDecoder.decode(record.data);
            setStatus('Tag read successfully!', 'success');
            showNotification(readText.value);
        }
      }
      isReading.value = false;
    });

    ndef.addEventListener('error', (error: ErrorEvent) => {
      setStatus(`Error reading tag: ${error.message}`, 'error');
      isReading.value = false;
    });

  } catch (error: any) {
    console.error('Error scanning NFC:', error);
    setStatus(`Failed to start NFC scan: ${error.message}`, 'error');
    isReading.value = false;
  }
}

// Start writing to NFC tags
async function startWriting(): Promise<void> {
  if (!nfcSupported.value || !textToWrite.value) return;

  try {
    isWriting.value = true;

    const ndef = new window.NDEFReader();
    setStatus('Tap an NFC tag to write...', 'info');

    await ndef.write({
      records: [{
        recordType: "text",
        data: textToWrite.value
      }]
    });

    setStatus('Successfully wrote to tag!', 'success');
    isWriting.value = false;

  } catch (error: any) {
    console.error('Error writing to NFC tag:', error);
    setStatus(`Failed to write to tag: ${error.message}`, 'error');
    isWriting.value = false;
  }
}</script>

<style>
body {
  @apply bg-white text-gray-800;
}
</style>
