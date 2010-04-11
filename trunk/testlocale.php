#!/usr/bin/php
<?php

$shortopts = "s:d:";
$options = getopt($shortopts);

if (	! array_key_exists('s',$options) ||
	! array_key_exists('d',$options) ||
	! is_dir($options['s']) ||
	! is_dir($options['d']) ) usage();

// reading list of source files
$dirfiles = scandir($options['s']);
foreach($dirfiles as $k => $v)
{
	if ( $v == "." || $v == ".." || $v == ".svn" ) continue;
	$srcfiles[] = $v;
}
sort($srcfiles);

// reading list of files to match and compare
$dirfiles = scandir($options['d']);
foreach($dirfiles as $k => $v)
{
	if ( $v == "." || $v == ".." || $v == ".svn" ) continue;
	if (!in_array($v, $srcfiles))
	{
		echo "$v isn't a source file. it'll be ignored\n";
		continue;
	}
	$dstfiles[] = $v;
}
sort($dstfiles);

foreach($srcfiles as $src)
{
	if ( ! in_array($src,$dstfiles))
	{
		echo "$src is missing in ".$options['d']."\n";
		exit(1);
	}
}

$patdtd = array("/\n/",'/>.*/', '/^<!ENTITY */', '/ \".*/');
$repldtd= array('','', '', '');
$patprop = array("/\n/",'/=.*/');
$replprop= array('','');

$err = 0;

foreach($srcfiles as $src)
{
	$pat = null;
	$repl = null;
	if ( preg_match('/\.dtd/',$src) != 0 )
	{
		$pat=$patdtd;
		$repl=$repldtd;
	}

	if ( preg_match('/\.properties/',$src) != 0 )
	{
		$pat=$patprop;
		$repl=$replprop;
	}

	if ( !$pat && !$repl) continue;

	// we parse the source tags
	$srctags = array();
	$handle = fopen($options['s'].'/'.$src, 'r');
	if ( $handle == false )
	{
		echo $options['s'].'/'."$src cannot be opened. skipping...\n";
		$err = 1;
		continue;
	}
	while(!feof($handle))
	{
		$str = fgets($handle);
		if ( preg_match('/^#/',$str) != 0 ) continue;
		$srctags[]=preg_replace($pat,$repl,$str);
	}
	fclose($handle);

	// we parse the destination tags
	$dsttags = array();
	$handle = fopen($options['d'].'/'.$src, 'r');
	if ( $handle == false )
	{
		echo $options['d'].'/'."$src cannot be opened. skipping...\n";
		$err = 1;
		continue;
	}
	echo "checking ".$options['d'].'/'."$src vs ".$options['s'].'/'."$src \n";
	while(!feof($handle))
	{
		$str = fgets($handle);
		if ( preg_match('/^#/',$str) != 0 ) continue;
		$tag=preg_replace($pat,$repl,$str);
		if ( !in_array($tag,$srctags) )
		{
			echo $options['d'].'/'."$src:$tag is obsolete\n";
			$err = 1;
			continue;
		}
		$dsttags[]=$tag;
	}
	fclose($handle);

	foreach($srctags as $tag)
	{
		if(!in_array($tag,$dsttags))
		{
			echo $options['d'].'/'."$src:$tag is not present\n";
			$err = 1;
		}
	}
}

exit($err);

function usage()
{
	echo "usage: checklocales.php -s reference_locale -d locale\n";
	exit;
}

?>
