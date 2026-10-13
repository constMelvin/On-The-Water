package expo.modules.otwexit

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Closes the app for real. BackHandler.exitApp() only moves the task to the background on Android 11
 * and below (MainActivity's invokeDefaultOnBackPressed), so the app stays running and in Recents.
 */
class OtwExitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OtwExit")

    Function("exitApp") {
      val activity = appContext.currentActivity
      activity?.runOnUiThread { activity.finishAndRemoveTask() }
      null
    }
  }
}
