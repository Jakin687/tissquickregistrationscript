TISS Quick Registration Script v2
===========================
by Jakob Kinne / originaly by [Manuel Geier](https://geier.io "Manuel Geier")

⚠️ **IMPORTANT: Use at your own risk. Feel free to fork it. All the best for your studies!**

## What is it about?

It is always very hard to get into a limited group if many other students (>200) also try to get into the same group. You have to be faster than anyone else. It was always a very thrilling moment, when the registration slots got opened. And so the idea was born to to create a automatic script, lean back and watch it doing its job in a very relaxed way.


### A brief description of the script and its possibilities

The UserScript helps you to get into the group you want on TISS fully automatically. It opens the right panel, registers and confirms your registration. If you don’t want the script to do everything automatically, the focus is already set on the right button, so you only need to confirm. There is also an option available to auto refresh the page, if the registration button is not available yet, so you can open the site and watch the script doing its work. You can also set a specific time when the script should reload the page and start.


## Requirements

* Google Chrome with [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo "Tampermonkey"), or
* Firefox with [Greasemonkey](https://addons.mozilla.org/de/firefox/addon/greasemonkey "Greasemonkey")


## Usage

1. Download the UserScript and install it to Tampermonkey/Greasemonkey.
1. Visit the dashboard of the previously installed plugin
1. Create a new script and copy/paste the downloaded one
1. Go to the specific LVA/Group/Exam registration webpage in TISS, where you want to register.
1. The Script should inject its GUI into the top left corner of the page
1. Configure and save your configuration within the interface
1. Start the script and lean back(it automatically starts if you entered a startdate (prefered) or refreshes the page continuously (see Configuration))
1. Afer you are registered the script should automaticaly stop

### Notes
+ The scripts interface will only be displayed on the correct pages
+ Even after you're registered the configuration of a registration is going to be available. You can keep or delete it (deletion is recommended)
+ You can edit every configuration on every page the interface is displayed in. However, you can only successfully start a configuration on its own page
+ Configurations are persistent, even if you reload the window or close the tab/browser (*SCRIPT WILL ONLY WORK IF STARTED AND ON THE CORRECT PAGE || THEREFORE BROWSER CLOSED = NOT WORKING*)
+ It is possible to register for multiple things at once. You only need to have every registration in different tabs opened, configured and started at the same time (No need to create a duplicate of the script or slt).


## Configuration

See documentation within the script.


## License

MIT (see LICENSE)


## Disclaimer

By utilizing this script, you acknowledge and agree that I, the author, bear no responsibility for any consequences, damages, losses, or liabilities incurred as a result of its usage. This script is provided "as is," without any warranties or guarantees of any kind, expressed or implied. Users are solely responsible for assessing the suitability, accuracy, and safety of the script for their intended purposes. I disclaim all responsibility for any errors, omissions, or inaccuracies within the script. It is recommended that users exercise caution and diligence when employing this script, and they do so at their own risk.
