all:
	ansible-playbook -i inventory.ini main.yml
run: all

test:
	ansible all -i inventory.ini -m ping
ping: test

