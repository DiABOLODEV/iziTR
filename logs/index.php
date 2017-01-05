<?php

if ($_POST['name'] != null AND $_POST['content'] != null){
    $name = $_POST['name'].".json";
    echo $_POST['content'];
    file_put_contents ( $name , $_POST['content'] );
}
if ($_GET['name'] != null){
    $name = $_GET['name'].".json";
    echo  file_get_contents ($name);
}
?>