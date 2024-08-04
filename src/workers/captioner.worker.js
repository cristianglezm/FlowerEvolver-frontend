import { describe } from '../store/AIStore/AI';

/**
 * @brief Processes an image URL/Data URL to generate a description of the flower.
 * 
 * This Web Worker listens for messages from the main thread containing details about a flower image.
 * It processes the image to generate a description, then sends the description back to the main thread.
 *
 * @param {String} urlOrDataURL - The URL or Data URL of the flower image to be described.
 * @param {Boolean} isLocal - A flag indicating whether the image is stored locally (true) or remotely (false).
 * @param {Number} FlowerID - A unique identifier for the flower image.
 *
 * @example
 * // Main thread sends a message to the worker
 * captionerWorker.postMessage({
 *     urlOrDataURL: 'https://backend.io/42.jpg',
 *     isLocal: false,
 *     FlowerID: 42
 * });
 *
 * // The worker processes the image and sends back a message with the description
 * self.postMessage({
 *     FlowerID: 42,
 *     description: 'A flower with 6 petals that are wide and have a slight wave to their edges. The petals are pink with a striped pattern. The center of the flower is a solid pink circle.',
 *     isLocal: true
 * });
 */
self.onmessage = async (e) => {
    const urlOrDataURL = e.data.urlOrDataURL;
    const isLocal = e.data.isLocal;
    const output = await describe(urlOrDataURL);
    self.postMessage({
             FlowerID: e.data.FlowerID,
             description: output,
             isLocal: isLocal
    });
};
