<template>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:z-50 focus:rounded">
    Skip to main content
  </a>
  <div id="main-content" class="container mx-auto p-4 max-w-lg">
    <h1 class="text-2xl font-bold mb-6 text-center dark:text-white">NFC Text Reader/Writer</h1>

    <div v-if="nfcSupported === false" class="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 mb-6" role="alert" aria-labelledby="nfc-error">
      <p id="nfc-error">Your device doesn't support NFC or the Web NFC API. This application requires a device with NFC capabilities and a compatible browser.</p>
    </div>

    <div v-if="status" :class="statusClass" class="p-4 mb-6 rounded" role="status" aria-live="polite" aria-atomic="true">
      {{ status }}
    </div>

    <div class="grid grid-cols-1 gap-6">
    <!-- Read Mode Section -->
    <div class="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h2 class="text-xl font-semibold mb-4 dark:text-white">Read NFC Tag</h2>
      <p class="mb-4 text-gray-600 dark:text-gray-300">Tap an NFC tag to read its content.</p>

        <button
          @click="startReading"
          class="w-full font-bold bg-blue-700 hover:bg-blue-600 text-white py-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :disabled="isReading || !nfcSupported"
          :aria-busy="isReading"
          aria-controls="tag-content"
        >
          {{ isReading ? 'Listening for tags...' : 'Start Reading' }}
        </button>

        <div v-if="readText" class="mt-4 p-3 bg-white dark:bg-gray-700 border rounded dark:border-gray-600">
          <h3 class="font-medium mb-2 dark:text-white">Tag Content:</h3>
          <p class="break-words dark:text-gray-200" aria-live="polite" aria-atomic="true">{{ readText }}</p>
        </div>
      </div>

      <!-- Write Mode Section -->
      <div class="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <h2 class="text-xl font-semibold mb-4 dark:text-white">Write to NFC Tag</h2>
        <div class="mb-4">
        <label for="write-text" class="block mb-2 text-gray-700 dark:text-gray-200">Text to write:</label>
        <textarea
          id="write-text"
          v-model="textToWrite"
          rows="4"
          class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter text to write to the NFC tag..."
          aria-describedby="write-text-instructions"
        ></textarea>
        <div id="write-text-instructions" class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Enter the text you want to write to an NFC tag, then press the Write to Tag button and touch a tag to your device.
          </div>
        </div>
        <button
          @click="startWriting"
          class="w-full font-bold bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          :disabled="isWriting || !textToWrite || !nfcSupported"
          :aria-busy="isWriting"
          aria-label="Write text to NFC tag"
        >
          {{ isWriting ? 'Tap a tag to write...' : 'Write to Tag' }}
        </button>
        <div v-if="isWriting" class="sr-only" aria-live="assertive">
          Ready to write. Please tap an NFC tag with your device.
        </div>
      </div>
    </div>
  </div>
  <!-- Hidden live region for screen reader announcements -->
  <div id="status-announcement" class="sr-only" aria-live="assertive" aria-atomic="true"></div>
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
// let hasChar = false;

// const invisibleChar = '\u200B';
const statusTimeout = ref<number | null>(null);
const lastFocusedElement = ref<HTMLElement | null>(null);

// Check if NFC is supported and set up keyboard accessibility
onMounted(() => {
  // Check NFC support
  if ('NDEFReader' in window) {
    nfcSupported.value = true;
  } else {
    nfcSupported.value = false;
    // Announce to screen readers that NFC is not supported
    const announcement = document.getElementById('status-announcement');
    if (announcement) {
      announcement.textContent = 'NFC is not supported on this device. The application functionality will be limited.';
    }
  }

  // Set up keyboard handler for escape key to cancel operations
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isReading.value || isWriting.value) {
        isReading.value = false;
        isWriting.value = false;
        setStatus('Operation cancelled by user', 'info');

        // Return focus to the last focused element
        if (lastFocusedElement.value) {
          lastFocusedElement.value.focus();
        }
      }
    }
  });
});

// Set status message with color
function setStatus(message: string, type: StatusType = 'info'): void {
  // Clear any existing timeout
  if (statusTimeout.value) {
    clearTimeout(statusTimeout.value);
  }

  status.value = message;

  switch (type) {
    case 'success':
      statusClass.value = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      break;
    case 'error':
      statusClass.value = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      break;
    case 'info':
    default:
      statusClass.value = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      break;
  }

  // Announce to screen readers
  const announcement = document.getElementById('status-announcement');
  if (announcement) {
    announcement.textContent = message;
  }

  // Clear status after 5 seconds (increased from 3 for better screen reader support)
  statusTimeout.value = setTimeout(() => {
    status.value = '';
    if (announcement) {
      announcement.textContent = '';
    }
  }, 5000);
}

// Start reading NFC tags
async function startReading(): Promise<void> {
  if (!nfcSupported.value) return;

  // Save the last focused element
  lastFocusedElement.value = document.activeElement as HTMLElement;

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
            readText.value = '';
            // Use nextTick to ensure screen readers detect the change
            nextTick(() => {
              readText.value = textDecoder.decode(record.data);
              // Focus on the tag content for screen readers
              const contentElement = document.getElementById('tag-content');
              if (contentElement) contentElement.focus();
            });
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

  // Save the last focused element
  lastFocusedElement.value = document.activeElement as HTMLElement;

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

    // Announce success to screen readers
    const announcement = document.getElementById('status-announcement');
    if (announcement) {
      announcement.textContent = `Text successfully written to NFC tag: "${textToWrite.value}"`;
    }

    // Return focus to the button
    if (lastFocusedElement.value) {
      lastFocusedElement.value.focus();
    }

  } catch (error: any) {
    console.error('Error writing to NFC tag:', error);
    setStatus(`Failed to write to tag: ${error.message}`, 'error');
    isWriting.value = false;
  }
}</script>

<style>
body {
  @apply bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100;
}
</style>
