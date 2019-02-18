import processEmailJobs from "./util/processEmailJobs";

/**
 * @param {Object} context App context
 * @returns {undefined}
 */
export default function startup(context) {
  processEmailJobs(context);
}
