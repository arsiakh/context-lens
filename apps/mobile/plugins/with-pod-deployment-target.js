const { withPodfile } = require("expo/config-plugins");

const MARKER = "Context Lens: normalize CocoaPods deployment targets for Xcode 27";
const PROJECT_MARKER = "Context Lens: select the generated Xcode project explicitly";

module.exports = function withPodDeploymentTarget(config, options = {}) {
  const deploymentTarget = options.deploymentTarget ?? "16.4";
  const projectName = options.projectName;

  return withPodfile(config, (modConfig) => {
    let podfile = modConfig.modResults.contents;

    if (projectName && !podfile.includes(PROJECT_MARKER)) {
      const targetDeclaration = `target '${projectName}' do`;
      if (!podfile.includes(targetDeclaration)) {
        throw new Error(`Unable to find the ${projectName} CocoaPods target.`);
      }
      podfile = podfile.replace(
        targetDeclaration,
        `# ${PROJECT_MARKER}. This prevents a stale Xcode workspace from making\n# CocoaPods project selection ambiguous.\nproject '${projectName}.xcodeproj'\n\n${targetDeclaration}`,
      );
    }

    if (podfile.includes(MARKER)) {
      modConfig.modResults.contents = podfile;
      return modConfig;
    }

    const closingBlocks = "\n  end\nend";
    const insertionPoint = podfile.lastIndexOf(closingBlocks);
    if (insertionPoint === -1) {
      throw new Error("Unable to find the Expo Podfile post_install block.");
    }

    const deploymentTargetHook = `

    # ${MARKER}. Some resource-bundle targets retain the minimum from their
    # podspec even when the project-level platform is newer.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current_target.nil? || Gem::Version.new(current_target) < Gem::Version.new('${deploymentTarget}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end`;

    modConfig.modResults.contents =
      podfile.slice(0, insertionPoint) + deploymentTargetHook + podfile.slice(insertionPoint);
    return modConfig;
  });
};
