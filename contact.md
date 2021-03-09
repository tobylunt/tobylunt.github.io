---
title: CONTACT
permalink: /contact/
---
[//]: # see http://webdesign.tutsplus.com/tutorials/quick-tip-add-a-formspree-form-to-your-static-sites--cms-23870

[//]: # input type="text" name="name" placeholder="Your name"> (This can go inside form element to input name)
<form id="contactform" method="POST" class="bootstrap-frm" action="https://formspree.io/f/xknpdoaj">
    <div>
        <input type="email" name="_replyto" placeholder="Your email address">
        <input type="hidden" name="_subject" value="Website contact" />
        <input type="hidden" name="_next" value="{{ site.baseurl }}/thank-you/" />
        <textarea name="message" placeholder="Your message"></textarea>
        <input type="text" name="_gotcha" style="display:none" />
    </div>
    <input type="submit" value="Submit">
</form>
<script>
    var contactform =  document.getElementById('contactform');
    contactform.setAttribute('action', '//formspree.io/' + 'toby.lunt' + '@' + 'gmail' + '.' + 'com');
</script>   

