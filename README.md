# ansibleInventoryGenerator
Script to generate an Ansible inventory from AWS tags

There are lots of scripts like this out there, I guess this is a very personal
thing. Please fork away and customize. Good Luck and I hope this is useful.

Yes I should probably use the ec2.py dynamic inventory but this seemed more
straight forward for now.

Tags Used:

* Name: used to specify the alias
* Env: used for grouping
* Service: used for grouping

It assumes your hosts are configured in your ssh config

You should be able to use AWS env vars or `~/.aws/credentials`.

## Example Usage

Test out the script `node index.js`.

Save the output to your ssh config `AWS_REGION=us-west-2 node index.js > inventory.yml`
