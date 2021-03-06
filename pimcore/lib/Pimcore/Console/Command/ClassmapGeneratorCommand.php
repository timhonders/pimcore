<?php
/**
 * Pimcore
 *
 * This source file is subject to the GNU General Public License version 3 (GPLv3)
 * For the full copyright and license information, please view the LICENSE.md and gpl-3.0.txt
 * files that are distributed with this source code.
 *
 * @copyright  Copyright (c) 2009-2016 pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GNU General Public License version 3 (GPLv3)
 */

namespace Pimcore\Console\Command;

use Pimcore\Console\AbstractCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ClassmapGeneratorCommand extends AbstractCommand
{
    protected function configure()
    {
        $this
            ->setName('classmap-generator')
            ->setDescription('Generate class maps to improve performance')
            ->addOption(
                'core', 'c',
                InputOption::VALUE_NONE,
                "Generate class map for all core files in /pimcore (usually used by the core team)"
            )
            ->addOption(
                'website', 'w',
                InputOption::VALUE_NONE,
                'Generate class map for all classes in include path (usually for you ;-) ) - this is the default'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $excludePatterns = [];
        if ($input->getOption("core")) {
            $paths = array(
                PIMCORE_PATH . "/lib",
                PIMCORE_PATH . "/models",
            );
            $output = PIMCORE_PATH . "/config/autoload-classmap.php";

            $excludePatterns = [
                "/^Csv/",
            ];
        } else {
            $paths = explode(PATH_SEPARATOR, get_include_path());
            $output = PIMCORE_CONFIGURATION_DIRECTORY . "/autoload-classmap.php";
        }

        $globalMap = array();
        $map = new \stdClass();

        foreach ($paths as $path) {
            $path = trim($path);

            if (empty($path) || strpos($path, "/vendor/") || !is_dir($path)) {
                continue;
            }

            // only pimcore related classes, not the ones in eg. /usr/share/php ...
            if (strpos($path, PIMCORE_PATH) !== 0 && strpos($path, PIMCORE_WEBSITE_PATH) !== 0) {
                continue;
            }

            // Get the ClassFileLocator, and pass it the library path
            $this->output->writeln("current path: " . $path);
            $l = new \Zend_File_ClassFileLocator($path);

            // Iterate over each element in the path, and create a map of
            // classname => filename, where the filename is relative to the library path
            //$map    = new stdClass;
            //iterator_apply($l, 'createMap', array($l, $map));

            foreach ($l as $file) {
                $filename  = str_replace(PIMCORE_DOCUMENT_ROOT, "\$pdr . '", $file->getRealpath());

                // Windows portability
                $filename  = str_replace(DIRECTORY_SEPARATOR, "/", $filename);

                foreach ($file->getClasses() as $class) {
                    $allowed = true;
                    foreach ($excludePatterns as $excludePattern) {
                        if (preg_match($excludePattern, $class)) {
                            $allowed = false;
                            break;
                        }
                    }

                    if ($allowed) {
                        $map->{$class} = $filename;
                    }
                }
            }

            $globalMap = array_merge($globalMap, (array) $map);
        }

        // Create a file with the class/file map.
        // Stupid syntax highlighters make separating < from PHP declaration necessary
        $content = '<' . "?php\n"
            . '$pdr = PIMCORE_DOCUMENT_ROOT;' . "\n"
            . 'return ' . var_export((array) $globalMap, true) . ';';

        // Prefix with dirname(__FILE__); modify the generated content
        $content = str_replace("\\'", "'", $content);
        $content = str_replace("'\$pdr", "\$pdr", $content);

        // Write the contents to disk
        file_put_contents($output, $content);

        $this->output->writeln("Class map generated: " . $output);
    }
}
